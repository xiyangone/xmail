import { NotFoundError } from "cloudflare";
import "dotenv/config";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  createDatabase,
  createKVNamespace,
  getDatabase,
  getKVNamespaceList,
} from "./cloudflare";

const PROJECT_NAME = process.env.PROJECT_NAME || "xmail";
const DATABASE_NAME = process.env.DATABASE_NAME || "xmail-db";
const KV_NAMESPACE_NAME = process.env.KV_NAMESPACE_NAME || "xmail-kv";
const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID;
const REALTIME_WS_URL = process.env.REALTIME_WS_URL;
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN?.trim();
const WORKER_SECRET_BINDINGS = ["INTERNAL_WORKER_SECRET"];

// Keep Wrangler deploy logs quiet unless the caller explicitly overrides it.
process.env.WRANGLER_SEND_METRICS ??= "false";

const removeConflictingSecretVars = (json: { vars?: Record<string, unknown> }) => {
  if (!json.vars) {
    return false;
  }

  let changed = false;
  for (const binding of WORKER_SECRET_BINDINGS) {
    if (Object.prototype.hasOwnProperty.call(json.vars, binding)) {
      delete json.vars[binding];
      changed = true;
    }
  }

  if (Object.keys(json.vars).length === 0) {
    delete json.vars;
  }

  return changed;
};

const sanitizeConfigSecrets = (configPath: string) => {
  if (!existsSync(configPath)) {
    return;
  }

  try {
    const json = JSON.parse(readFileSync(configPath, "utf-8"));
    if (removeConflictingSecretVars(json)) {
      writeFileSync(configPath, JSON.stringify(json, null, 2));
      console.log(`✅ Removed secret placeholders from ${configPath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sanitize ${configPath}:`, error);
    throw error;
  }
};

const updateCustomDomainRoute = (json: { routes?: unknown[] }) => {
  if (!Array.isArray(json.routes)) {
    return false;
  }

  let changed = false;
  const routes = json.routes.filter((route) => {
    if (!route || typeof route !== "object") {
      return true;
    }

    const customDomainRoute = route as { custom_domain?: unknown; pattern?: unknown };
    if (
      customDomainRoute.custom_domain === true &&
      typeof customDomainRoute.pattern === "string" &&
      customDomainRoute.pattern.includes("${CUSTOM_DOMAIN}") &&
      !CUSTOM_DOMAIN
    ) {
      changed = true;
      return false;
    }

    if (customDomainRoute.custom_domain === true && CUSTOM_DOMAIN) {
      if (customDomainRoute.pattern !== CUSTOM_DOMAIN) {
        customDomainRoute.pattern = CUSTOM_DOMAIN;
        changed = true;
      }
    }

    return true;
  });

  if (routes.length !== json.routes.length) {
    json.routes = routes;
  }

  if (!CUSTOM_DOMAIN && changed) {
    console.warn("⚠️ CUSTOM_DOMAIN is not set; skipping the Custom Domain route.");
  }

  return changed;
};

/**
 * 验证必要的环境变量
 */
const validateEnvironment = () => {
  const requiredEnvVars = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"];
  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

/**
 * 处理JSON配置文件
 */
const setupConfigFile = (examplePath: string, targetPath: string) => {
  try {
    // 如果目标文件已存在，则跳过
    if (existsSync(targetPath)) {
      console.log(`✨ Configuration ${targetPath} already exists.`);
      if (basename(targetPath) === "wrangler.json") {
        const json = JSON.parse(readFileSync(targetPath, "utf-8"));
        if (updateCustomDomainRoute(json)) {
          writeFileSync(targetPath, JSON.stringify(json, null, 2));
          console.log(`✅ Updated Custom Domain route in ${targetPath}`);
        }
        sanitizeConfigSecrets(targetPath);
      }
      return;
    }

    if (!existsSync(examplePath)) {
      console.log(`⚠️ Example file ${examplePath} does not exist, skipping...`);
      return;
    }

    const configContent = readFileSync(examplePath, "utf-8");
    const json = JSON.parse(configContent);

    // 处理自定义项目名称
    if (PROJECT_NAME !== "xmail") {
      const wranglerFileName = basename(targetPath);

      switch (wranglerFileName) {
        case "wrangler.json":
          json.name = PROJECT_NAME;
          // 同步更新 services 自引用绑定
          if (json.services && json.services.length > 0) {
            json.services[0].service = PROJECT_NAME;
          }
          break;
        case "wrangler.email.json":
          json.name = `${PROJECT_NAME}-email-receiver-worker`;
          break;
        case "wrangler.cleanup.json":
          json.name = `${PROJECT_NAME}-cleanup-worker`;
          break;
        case "wrangler.temp-cleanup.json":
          json.name = `${PROJECT_NAME}-temp-cleanup-worker`;
          break;
        default:
          break;
      }
    }

    if (basename(targetPath) === "wrangler.json" && REALTIME_WS_URL) {
      json.vars = {
        ...(json.vars ?? {}),
        REALTIME_WS_URL,
      };
    }

    if (basename(targetPath) === "wrangler.json") {
      updateCustomDomainRoute(json);
      removeConflictingSecretVars(json);
    }

    // 处理数据库配置
    if (json.d1_databases && json.d1_databases.length > 0) {
      json.d1_databases[0].database_name = DATABASE_NAME;
    }

    // 写入配置文件
    writeFileSync(targetPath, JSON.stringify(json, null, 2));
    console.log(`✅ Configuration ${targetPath} setup successfully.`);
  } catch (error) {
    console.error(`❌ Failed to setup ${targetPath}:`, error);
    throw error;
  }
};

/**
 * 设置所有Wrangler配置文件
 */
const setupWranglerConfigs = () => {
  console.log("🔧 Setting up Wrangler configuration files...");

  const configs = [
    { example: "wrangler.example.json", target: "wrangler.json" },
    { example: "wrangler.email.example.json", target: "wrangler.email.json" },
    { example: "wrangler.cleanup.example.json", target: "wrangler.cleanup.json" },
    { example: "wrangler.temp-cleanup.example.json", target: "wrangler.temp-cleanup.json" },
  ];

  // 处理每个配置文件
  for (const config of configs) {
    setupConfigFile(
      resolve(config.example),
      resolve(config.target)
    );
  }
};

/**
 * 更新数据库ID到所有配置文件
 */
const updateDatabaseConfig = (dbId: string) => {
  console.log(`📝 Updating database ID (${dbId}) in configurations...`);

  // 更新所有配置文件
  const configFiles = [
    "wrangler.json",
    "wrangler.email.json",
    "wrangler.cleanup.json",
    "wrangler.temp-cleanup.json",
  ];
  
  for (const filename of configFiles) {
    const configPath = resolve(filename);
    if (!existsSync(configPath)) continue;
    
    try {
      const json = JSON.parse(readFileSync(configPath, "utf-8"));
      if (json.d1_databases && json.d1_databases.length > 0) {
        json.d1_databases[0].database_id = dbId;
      }
      writeFileSync(configPath, JSON.stringify(json, null, 2));
      console.log(`✅ Updated database ID in ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to update ${filename}:`, error);
    }
  }
};

/**
 * 更新KV命名空间ID到所有配置文件
 */
const updateKVConfig = (namespaceId: string) => {
  console.log(`📝 Updating KV namespace ID (${namespaceId}) in configurations...`);
  
  // 更新所有使用KV的配置文件
  const kvConfigFiles = [
    "wrangler.json",
    "wrangler.cleanup.json",
    "wrangler.temp-cleanup.json",
  ];
  
  for (const filename of kvConfigFiles) {
    const configPath = resolve(filename);
    if (!existsSync(configPath)) continue;
    
    try {
      const json = JSON.parse(readFileSync(configPath, "utf-8"));
      if (json.kv_namespaces && json.kv_namespaces.length > 0) {
        json.kv_namespaces[0].id = namespaceId;
      }
      writeFileSync(configPath, JSON.stringify(json, null, 2));
      console.log(`✅ Updated KV namespace ID in ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to update ${filename}:`, error);
    }
  }
};

/**
 * 检查并创建数据库
 */
const checkAndCreateDatabase = async () => {
  console.log(`🔍 Checking if database "${DATABASE_NAME}" exists...`);

  try {
    const database = await getDatabase();
    
    if (!database || !database.uuid) {
      throw new Error('Database object is missing a valid UUID');
    }
    
    updateDatabaseConfig(database.uuid);
    console.log(`✅ Database "${DATABASE_NAME}" already exists (ID: ${database.uuid})`);
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log(`⚠️ Database not found, creating new database...`);
      try {
        const database = await createDatabase();
        
        if (!database || !database.uuid) {
          throw new Error('Database object is missing a valid UUID');
        }
        
        updateDatabaseConfig(database.uuid);
        console.log(`✅ Database "${DATABASE_NAME}" created successfully (ID: ${database.uuid})`);
      } catch (createError) {
        console.error(`❌ Failed to create database:`, createError);
        throw createError;
      }
    } else {
      console.error(`❌ An error occurred while checking the database:`, error);
      throw error;
    }
  }
};

/**
 * 迁移数据库
 */
const migrateDatabase = () => {
  console.log("📝 Migrating remote database...");
  try {
    const output = execSync("pnpm run db:migrate-remote", { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(output);
    console.log("✅ Database migration completed successfully");
  } catch (error: any) {
    console.error("❌ Database migration failed:");
    if (error.stdout) console.error("STDOUT:", error.stdout);
    if (error.stderr) console.error("STDERR:", error.stderr);
    throw error;
  }
};

/**
 * 检查并创建KV命名空间
 */
const checkAndCreateKVNamespace = async () => {
  console.log(`🔍 Checking if KV namespace "${KV_NAMESPACE_NAME}" exists...`);

  if (KV_NAMESPACE_ID) {
    updateKVConfig(KV_NAMESPACE_ID);
    console.log(`✅ User specified KV namespace (ID: ${KV_NAMESPACE_ID})`);
    return;
  }

  try {
    let namespace;

    const namespaceList = await getKVNamespaceList();
    namespace = namespaceList.find(ns => ns.title === KV_NAMESPACE_NAME);

    if (namespace && namespace.id) {
      updateKVConfig(namespace.id);
      console.log(`✅ KV namespace "${KV_NAMESPACE_NAME}" found by name (ID: ${namespace.id})`);
    } else {
      console.log("⚠️ KV namespace not found by name, creating new KV namespace...");
      namespace = await createKVNamespace();
      updateKVConfig(namespace.id);
      console.log(`✅ KV namespace "${KV_NAMESPACE_NAME}" created successfully (ID: ${namespace.id})`);
    }
  } catch (error) {
    console.error(`❌ An error occurred while checking the KV namespace:`, error);
    throw error;
  }
};

/**
 * 推送Worker密钥
 */
const pushWorkerSecrets = () => {
  console.log("🔐 Pushing environment secrets to Worker...");

  // 定义运行时所需的环境变量列表
  const requiredEnvVars = ['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET', 'AUTH_SECRET'];
  const optionalEnvVars = ['TURNSTILE_SECRET_KEY', 'INTERNAL_WORKER_SECRET'];
  const runtimeEnvVars = [...requiredEnvVars, ...optionalEnvVars];

  // 兼容老的部署方式，如果必须的环境变量不存在，则跳过推送
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.log(`🔐 Skipping pushing secrets to Worker...`);
      return;
    }
  }

  try {
    // 确保.env文件存在
    if (!existsSync(resolve('.env'))) {
      setupEnvFile();
    }

    // 创建一个临时文件，只包含运行时所需的环境变量
    const envContent = readFileSync(resolve('.env'), 'utf-8');
    const runtimeEnvFile = resolve('.env.runtime');

    // 从.env文件中提取运行时变量
    const runtimeEnvContent = envContent
      .split('\n')
      .filter(line => {
        const trimmedLine = line.trim();
        // 跳过注释和空行
        if (!trimmedLine || trimmedLine.startsWith('#')) return false;

        // 检查是否为运行时所需的环境变量
        for (const varName of runtimeEnvVars) {
          if (line.startsWith(`${varName} =`) || line.startsWith(`${varName}=`)) {
            return requiredEnvVars.includes(varName) || Boolean(process.env[varName]);
          }
        }
        return false;
      })
      .join('\n');

    // 写入临时文件
    writeFileSync(runtimeEnvFile, runtimeEnvContent);

    // 使用临时文件推送secrets（Workers secret bulk，不需要 --project-name）
    execSync(`pnpm dlx wrangler secret bulk ${runtimeEnvFile}`, { stdio: "inherit" });

    // 清理临时文件
    rmSync(runtimeEnvFile, { force: true });

    console.log("✅ Secrets pushed successfully");
  } catch (error) {
    console.error("❌ Failed to push secrets:", error);
    throw error;
  }
};

/**
 * 更新实时推送公开连接地址
 */
const updateRealtimeConfig = () => {
  if (!REALTIME_WS_URL) {
    return;
  }

  const configPath = resolve("wrangler.json");
  if (!existsSync(configPath)) {
    return;
  }

  try {
    const json = JSON.parse(readFileSync(configPath, "utf-8"));
    json.vars = {
      ...(json.vars ?? {}),
      REALTIME_WS_URL,
    };
    writeFileSync(configPath, JSON.stringify(json, null, 2));
    console.log("✅ Updated REALTIME_WS_URL in wrangler.json");
  } catch (error) {
    console.error("❌ Failed to update realtime config:", error);
    throw error;
  }
};

/**
 * 推送 Email Worker 密钥
 */
const pushEmailWorkerSecrets = () => {
  if (!process.env.INTERNAL_WORKER_SECRET) {
    console.log("🔐 Skipping Email Worker secrets: INTERNAL_WORKER_SECRET is not set.");
    return;
  }

  console.log("🔐 Pushing environment secrets to Email Worker...");

  try {
    const runtimeEnvFile = resolve('.env.email-runtime');
    writeFileSync(runtimeEnvFile, `INTERNAL_WORKER_SECRET="${process.env.INTERNAL_WORKER_SECRET}"\n`);

    execSync(`pnpm dlx wrangler secret bulk --config wrangler.email.json ${runtimeEnvFile}`, { stdio: "inherit" });

    rmSync(runtimeEnvFile, { force: true });

    console.log("✅ Email Worker secrets pushed successfully");
  } catch (error) {
    console.error("❌ Failed to push Email Worker secrets:", error);
    throw error;
  }
};

/**
 * 部署Worker应用
 */
const deployWorker = () => {
  console.log("🚧 Deploying to Cloudflare Workers...");
  try {
    console.log("📦 Building Next.js application...");
    const buildOutput = execSync("pnpm run build:worker", {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    console.log(buildOutput);
    console.log("✅ Build completed successfully");

    console.log("🚀 Deploying to Cloudflare Workers...");
    const deployOutput = execSync("pnpm dlx wrangler deploy", {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024
    });
    console.log(deployOutput);
    console.log("✅ Worker deployment completed successfully");
  } catch (error: any) {
    console.error("❌ Worker deployment failed:");
    if (error.stdout) console.error("STDOUT:", error.stdout);
    if (error.stderr) console.error("STDERR:", error.stderr);
    if (error.message) console.error("Message:", error.message);
    throw error;
  }
};

/**
 * 部署Email Worker
 */
const deployEmailWorker = () => {
  console.log("🚧 Deploying Email Worker...");
  try {
    const output = execSync("pnpm dlx wrangler deploy --config wrangler.email.json", { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(output);
    console.log("✅ Email Worker deployed successfully");
  } catch (error: any) {
    console.error("❌ Email Worker deployment failed:");
    if (error.stdout) console.error("STDOUT:", error.stdout);
    if (error.stderr) console.error("STDERR:", error.stderr);
    // 继续执行而不中断
  }
};

/**
 * 部署Cleanup Worker
 */
const deployCleanupWorker = () => {
  console.log("🚧 Deploying Cleanup Worker...");
  try {
    const output = execSync("pnpm dlx wrangler deploy --config wrangler.cleanup.json", { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(output);
    console.log("✅ Cleanup Worker deployed successfully");
  } catch (error: any) {
    console.error("❌ Cleanup Worker deployment failed:");
    if (error.stdout) console.error("STDOUT:", error.stdout);
    if (error.stderr) console.error("STDERR:", error.stderr);
    // 继续执行而不中断
  }
};

/**
 * 部署Temp Cleanup Worker
 */
const deployTempCleanupWorker = () => {
  console.log("🚧 Deploying Temp Cleanup Worker...");
  try {
    const output = execSync("pnpm dlx wrangler deploy --config wrangler.temp-cleanup.json", { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(output);
    console.log("✅ Temp Cleanup Worker deployed successfully");
  } catch (error: any) {
    console.error("❌ Temp Cleanup Worker deployment failed:");
    if (error.stdout) console.error("STDOUT:", error.stdout);
    if (error.stderr) console.error("STDERR:", error.stderr);
    // 继续执行而不中断
  }
};

/**
 * 创建或更新环境变量文件
 */
const setupEnvFile = () => {
  console.log("📄 Setting up environment file...");
  const envFilePath = resolve(".env");
  const envExamplePath = resolve(".env.example");
  
  // 如果.env文件不存在，则从.env.example复制创建
  if (!existsSync(envFilePath) && existsSync(envExamplePath)) {
    console.log("⚠️ .env file does not exist, creating from example...");
    
    // 从示例文件复制
    let envContent = readFileSync(envExamplePath, "utf-8");
    
    // 填充当前的环境变量
    const envVarMatches = envContent.match(/^([A-Z_]+)\s*=\s*".*?"/gm);
    if (envVarMatches) {
      for (const match of envVarMatches) {
        const varName = match.split("=")[0].trim();
        if (process.env[varName]) {
          const regex = new RegExp(`${varName}\\s*=\\s*".*?"`, "g");
          envContent = envContent.replace(regex, `${varName} = "${process.env[varName]}"`);
        }
      }
    }
    
    writeFileSync(envFilePath, envContent);
    console.log("✅ .env file created from example");
  } else if (existsSync(envFilePath)) {
    console.log("✨ .env file already exists");
  } else {
    console.error("❌ .env.example file not found!");
    throw new Error(".env.example file not found");
  }
};

/**
 * 主函数
 */
const main = async () => {
  try {
    console.log("🚀 Starting deployment process...");

    validateEnvironment();
    setupEnvFile();
    setupWranglerConfigs();
    updateRealtimeConfig();
    await checkAndCreateDatabase();
    migrateDatabase();
    await checkAndCreateKVNamespace();
    deployWorker();
    pushWorkerSecrets();
    deployEmailWorker();
    pushEmailWorkerSecrets();
    deployCleanupWorker();
    deployTempCleanupWorker();

    console.log("🎉 Deployment completed successfully");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
};

main();
