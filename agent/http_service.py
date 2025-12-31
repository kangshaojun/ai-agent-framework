"""
Agent HTTP 服务
提供客服工单知识库的流式和非流式 HTTP 接口，专注服务内部 Server
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import asyncio
from typing import Optional
import uvicorn

from agent import ServiceTicketAgent

app = FastAPI(
    title="Service Ticket Agent",
    description="提供客服工单知识库 AI Agent 的流式对话接口，专注服务内部 Server",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# 请求/响应模型
# ============================================

class ChatRequest(BaseModel):
    """聊天请求"""
    question: str

# ============================================
# Agent 实例管理
# ============================================

agent_instance: Optional[ServiceTicketAgent] = None

def get_agent() -> ServiceTicketAgent:
    """获取或创建 Agent 实例（单例模式）"""
    global agent_instance
    if agent_instance is None:
        print("🔧 初始化 ServiceTicketAgent...")
        agent_instance = ServiceTicketAgent()
        print("✅ ServiceTicketAgent 初始化完成")
    return agent_instance


# ============================================
# HTTP SSE 流式接口
# ============================================

@app.post("/stream")
async def stream_chat(request: ChatRequest):
    """
    流式对话接口（SSE）
    
    返回 SSE 格式的流式数据：
    - event: thinking (思考状态)
    - event: sources (检索来源)
    - event: token (逐个 token)
    - event: done (完成)
    - event: error (错误)
    
    示例:
        POST /stream
        {"question": "客户说物流信息5天没更新，怎么处理？"}
    """
    async def event_generator():
        agent = get_agent()
        
        try:
            # 调用 Agent 的流式接口
            async for event in agent.ask_stream(request.question):
                event_type = event.get("type")
                event_data = event.get("data", {})
                
                # 格式化为 SSE
                yield f"event: {event_type}\n"
                yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                
                # 如果是完成或错误，结束流
                if event_type in ["done", "error"]:
                    break
                    
        except Exception as e:
            # 发送错误事件
            error_event = {
                "code": 500,
                "msg": f"Agent 错误: {str(e)}"
            }
            yield f"event: error\n"
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    非流式对话接口
    
    返回完整的 JSON 响应，适用于生成标题等场景
    
    示例:
        POST /chat
        {"question": "请根据以下用户问题生成一个简短的对话标题：客户说物流信息5天没更新"}
    """
    agent = get_agent()
    
    try:
        # 调用 Agent 的非流式接口
        result = agent.ask(request.question)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent 错误: {str(e)}"
        )


@app.get("/")
async def root():
    """根路径 - API 文档"""
    return {
        "service": "Service Ticket Agent",
        "version": "1.0.0",
        "description": "客服工单知识库 AI Agent 流式和非流式对话服务，专注服务内部 Server",
        "endpoints": {
            "stream": {
                "method": "POST",
                "path": "/stream",
                "description": "流式对话（SSE）",
                "example": {"question": "客户说物流信息5天没更新，怎么处理？"}
            },
            "chat": {
                "method": "POST",
                "path": "/chat",
                "description": "非流式对话（JSON）",
                "example": {"question": "请根据以下用户问题生成一个简短的对话标题：客户说物流信息5天没更新"}
            }
        },
        "docs": "/docs"
    }


# ============================================
# 启动和关闭事件
# ============================================

@app.on_event("startup")
async def startup_event():
    """启动时初始化"""
    print("\n" + "=" * 60)
    print("🚀 Agent HTTP Service 启动中...")
    print("=" * 60)
    print("📍 流式接口: POST /stream")
    print("📍 非流式接口: POST /chat")
    print("📍 API 文档: GET /docs")
    print("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """关闭时清理资源"""
    global agent_instance
    if agent_instance:
        try:
            agent_instance.close()
            print("✅ Agent 连接已关闭")
        except Exception as e:
            print(f"⚠️ Agent 关闭时出错: {e}")


# ============================================
# 主函数
# ============================================

if __name__ == "__main__":
    import sys
    
    # 默认配置
    host = "0.0.0.0"
    port = 8001
    
    # 从命令行参数读取配置
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    print(f"\n🌐 启动 Agent HTTP Service on http://{host}:{port}")
    print(f"📖 API 文档: http://{host}:{port}/docs\n")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
