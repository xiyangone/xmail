import { NextResponse } from "next/server";
import { getUserId } from "@/lib/apiKey";
import { getTempUserInfo } from "@/lib/card-keys";


export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      );
    }

    const tempInfo = await getTempUserInfo(userId);

    return NextResponse.json(tempInfo || { isTempUser: false });
  } catch (error) {
    console.error("获取临时用户信息失败:", error);
    return NextResponse.json(
      { error: "获取临时用户信息失败" },
      { status: 500 }
    );
  }
}
