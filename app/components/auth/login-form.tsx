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
import { Github, Loader2, KeyRound, User2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  const loginUsernameRef = useRef<HTMLInputElement>(null);
  const registerUsernameRef = useRef<HTMLInputElement>(null);
  const cardKeyRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);

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
    turnstileTokenRef.current = null;

    turnstileWidgetId.current = (window as any).turnstile.render(
      turnstileRef.current,
      {
        sitekey: siteKey,
        callback: (token: string) => {
          setTurnstileToken(token);
          turnstileTokenRef.current = token;
        },
        "expired-callback": () => {
          setTurnstileToken(null);
          turnstileTokenRef.current = null;
        },
        "error-callback": () => {
          setTurnstileToken(null);
          turnstileTokenRef.current = null;
        },
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
    turnstileTokenRef.current = null;
  }, []);

  // 等待 Turnstile 产生新 token（注册后自动登录用）
  const waitForNewTurnstileToken = useCallback(async (timeoutMs = 5000): Promise<string | null> => {
    turnstileTokenRef.current = null;
    resetTurnstile();
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (turnstileTokenRef.current) {
        return turnstileTokenRef.current;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    return null;
  }, [resetTurnstile]);

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
    if (!username) newErrors.username = t("errors.usernameRequired");
    if (!password) newErrors.password = t("errors.passwordRequired");
    if (username.includes("@")) newErrors.username = t("errors.usernameNoAt");
    if (password && password.length < 8)
      newErrors.password = t("errors.passwordMinLength");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegisterForm = () => {
    const newErrors: FormErrors = {};
    if (!username) newErrors.username = t("errors.usernameRequired");
    if (!password) newErrors.password = t("errors.passwordRequired");
    if (username.includes("@")) newErrors.username = t("errors.usernameNoAt");
    if (password && password.length < 8)
      newErrors.password = t("errors.passwordMinLength");
    if (!confirmPassword) newErrors.confirmPassword = t("errors.passwordMismatch");
    if (password !== confirmPassword)
      newErrors.confirmPassword = t("errors.passwordMismatch");
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
          title: t("errors.loginFailed"),
          description: t("errors.invalidCredentials"),
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      toast({
        title: t("errors.loginFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
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
          title: t("errors.registerFailed"),
          description: data.error || tc("pleaseRetryLater"),
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      // 注册成功后获取新 Turnstile token 再自动登录
      const freshToken = await waitForNewTurnstileToken(5000);
      if (freshToken) {
        const result = await signIn("credentials", {
          username,
          password,
          turnstileToken: freshToken,
          redirect: false,
        });

        if (result?.error) {
          toast({
            title: t("registerSuccess"),
            description: t("autoLoginFailed"),
          });
          setActiveTab("login");
          setLoading(false);
          return;
        }

        window.location.href = "/";
      } else {
        // Turnstile 未能及时提供新 token，引导手动登录
        toast({
          title: t("registerSuccess"),
          description: t("autoLoginFailed"),
        });
        setActiveTab("login");
        setLoading(false);
      }
    } catch (error) {
      toast({
        title: t("errors.registerFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
      resetTurnstile();
      setLoading(false);
    }
  };

  const handleCardKeyLogin = async () => {
    if (!cardKey.trim()) {
      toast({
        title: tc("error"),
        description: t("errors.cardKeyRequired"),
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
          title: t("errors.cardKeyLoginFailed"),
          description: result.error,
          variant: "destructive",
        });
        resetTurnstile();
        setLoading(false);
        return;
      }

      toast({
        title: t("loginSuccess"),
        description: t("loginSuccessDesc"),
      });
      window.location.href = "/";
    } catch (error) {
      toast({
        title: t("errors.cardKeyLoginFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
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
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <Card className="w-[95%] max-w-lg border-2 border-primary/20">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-center bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-mid))] bg-clip-text text-transparent">
          {t("welcome")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <Tabs defaultValue="login" className="w-full" onValueChange={clearForm}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="login">{t("loginTab")}</TabsTrigger>
            <TabsTrigger value="register">{t("registerTab")}</TabsTrigger>
            <TabsTrigger value="cardkey">{t("cardKeyTab")}</TabsTrigger>
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
                      placeholder={t("usernamePlaceholder")}
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
                        "h-9 pl-9 pr-10",
                        errors.password &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      type={showLoginPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2 py-2 hover:bg-transparent"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
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
                  {t("login")}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {tc("or")}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGithubLogin}
                >
                  <Github className="mr-2 h-4 w-4" />
                  {t("loginWithGithub")}
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
                      placeholder={t("usernamePlaceholder")}
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
                        "h-9 pl-9 pr-10",
                        errors.password &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2 py-2 hover:bg-transparent"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
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
                        "h-9 pl-9 pr-10",
                        errors.confirmPassword &&
                          "border-destructive focus-visible:ring-destructive"
                      )}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("confirmPasswordPlaceholder")}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-2 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
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
                  {t("register")}
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
                      placeholder={t("cardKeyPlaceholder")}
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
                  {t("cardKeyLogin")}
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
