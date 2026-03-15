"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, Loader2, KeyRound, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cardKey, setCardKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState("login");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { toast } = useToast();

  const loginUsernameRef = useRef<HTMLInputElement>(null);
  const registerUsernameRef = useRef<HTMLInputElement>(null);
  const cardKeyRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // 加载 Turnstile 脚本
  useEffect(() => {
    if (document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // 渲染 Turnstile widget
  const renderTurnstile = useCallback(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !turnstileRef.current) return;
    if (typeof window === "undefined" || !(window as any).turnstile) return;

    // 先移除旧 widget
    if (turnstileWidgetId.current) {
      try {
        (window as any).turnstile.remove(turnstileWidgetId.current);
      } catch {
        // ignore
      }
      turnstileWidgetId.current = null;
    }

    setTurnstileToken(null);

    turnstileWidgetId.current = (window as any).turnstile.render(
      turnstileRef.current,
      {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
        theme: "auto",
        size: "flexible",
      }
    );
  }, []);

  // 切换 tab 或脚本加载完成时渲染 widget
  useEffect(() => {
    // 等待脚本加载
    const timer = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(timer);
        renderTurnstile();
      }
    }, 200);

    return () => clearInterval(timer);
  }, [activeTab, renderTurnstile]);

  // 重置 Turnstile（提交失败后刷新）
  const resetTurnstile = useCallback(() => {
    if (turnstileWidgetId.current && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId.current);
    }
    setTurnstileToken(null);
  }, []);

  // 根据当前标签页自动聚焦到对应的输入框
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "login") {
        loginUsernameRef.current?.focus();
      } else if (activeTab === "register") {
        registerUsernameRef.current?.focus();
      } else if (activeTab === "cardkey") {
        cardKeyRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const validateLoginForm = () => {
    const newErrors: FormErrors = {};
    if (!username) newErrors.username = "请输入用户名";
    if (!password) newErrors.password = "请输入密码";
    if (username.includes("@")) newErrors.username = "用户名不能包含 @ 符号";
    if (password && password.length < 8)
      newErrors.password = "密码长度必须大于等于8位";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegisterForm = () => {
    const newErrors: FormErrors = {};
    if (!username) newErrors.username = "请输入用户名";
    if (!password) newErrors.password = "请输入密码";
    if (username.includes("@")) newErrors.username = "用户名不能包含 @ 符号";
    if (password && password.length < 8)
      newErrors.password = "密码长度必须大于等于8位";
    if (!confirmPassword) newErrors.confirmPassword = "请确认密码";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "两次输入的密码不一致";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) return;

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username,
        password,
        turnstileToken: turnstileToken || "",
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "登录失败",
          description: "用户名或密码错误",
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      toast({
        title: "登录失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
      resetTurnstile();
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateRegisterForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, turnstileToken: turnstileToken || "" }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast({
          title: "注册失败",
          description: data.error || "请稍后重试",
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      // 注册成功后自动登录
      const result = await signIn("credentials", {
        username,
        password,
        turnstileToken: turnstileToken || "",
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "登录失败",
          description: "自动登录失败，请手动登录",
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
      resetTurnstile();
      setLoading(false);
    }
  };

  const handleCardKeyLogin = async () => {
    if (!cardKey.trim()) {
      toast({
        title: "错误",
        description: "请输入卡密",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("card-key", {
        cardKey,
        turnstileToken: turnstileToken || "",
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "卡密登录失败",
          description: result.error,
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      toast({
        title: "登录成功",
        description: "欢迎使用临时邮箱服务",
      });
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "卡密登录失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
      resetTurnstile();
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    signIn("github", { callbackUrl: "/" });
  };

  const clearForm = (tab: string) => {
    setActiveTab(tab);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setCardKey("");
    setErrors({});
  };

  return (
    <Card className="w-[95%] max-w-lg border-2 border-primary/20">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-center bg-gradient-to-r from-[#FF8A3D] to-[#FF5E62] bg-clip-text text-transparent">
          欢迎使用 XiYang Mail
        </CardTitle>
        <CardDescription className="text-center">
          夕阳邮箱服务 (。・∀・)ノ
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Tabs defaultValue="login" className="w-full" onValueChange={clearForm}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
            <TabsTrigger value="cardkey">卡密</TabsTrigger>
          </TabsList>
          <div className="min-h-[220px]">
            <TabsContent value="login" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <User2 className="h-5 w-5" />
                    </div>
                    <Input
                      ref={loginUsernameRef}
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.username &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      placeholder="用户名"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive">
                      {errors.username}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.password &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      type="password"
                      placeholder="密码"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登录
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      或者
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGithubLogin}
                >
                  <Github className="mr-2 h-4 w-4" />
                  使用 GitHub 账号登录
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="register" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <User2 className="h-5 w-5" />
                    </div>
                    <Input
                      ref={registerUsernameRef}
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.username &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      placeholder="用户名"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive">
                      {errors.username}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.password &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      type="password"
                      placeholder="密码"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      className={cn(
                        "h-9 pl-9 pr-3",
                        errors.confirmPassword &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      type="password"
                      placeholder="确认密码"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  className="w-full"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  注册
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="cardkey" className="space-y-4 mt-0">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-2 text-muted-foreground">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <Input
                      ref={cardKeyRef}
                      className="h-9 pl-9 pr-3"
                      placeholder="请输入卡密 (格式: XYMAIL-XXXX-XXXX-XXXX)"
                      value={cardKey}
                      onChange={(e) => {
                        setCardKey(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <Button
                  className="w-full"
                  onClick={handleCardKeyLogin}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  使用卡密登录
                </Button>
              </div>
            </TabsContent>
          </div>
          <div ref={turnstileRef} className="flex justify-center my-3" />
        </Tabs>
      </CardContent>
    </Card>
  );
}
