"""API endpoints for conversations and messages."""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from server.dao.conversation_dao import ConversationDAO, MessageDAO
from server.dependencies import get_db_session
from server.auth import get_current_user
from server.models.user_model import User
from server.web.api.conversations.schemas import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
)
from server.web.api.response import success_response
from server.settings import settings

import httpx

router = APIRouter()


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Create a new conversation.

    :param conversation_data: conversation creation data
    :param session: database session
    :param current_user: current authenticated user
    :return: success response with conversation data
    """
    conversation_dao = ConversationDAO(session)
    conversation = await conversation_dao.create_conversation(
        user_id=current_user.id,
        title=conversation_data.title or "新对话",
    )
    
    # 在 commit 之前获取所有需要的属性
    response_data = ConversationResponse(
        id=str(conversation.id),
        title=conversation.title,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )
    
    await session.commit()

    return success_response(data=response_data.model_dump())


@router.get("", response_model=dict)
async def get_conversations(
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Get all conversations for current user.

    :param limit: max number of conversations to return
    :param offset: offset for pagination
    :param session: database session
    :param current_user: current authenticated user
    :return: success response with list of conversations
    """
    conversation_dao = ConversationDAO(session)
    conversations = await conversation_dao.get_user_conversations(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    return success_response(
        data=[
            ConversationResponse(
                id=str(conv.id),
                title=conv.title,
                created_at=conv.created_at.isoformat(),
                updated_at=conv.updated_at.isoformat(),
            ).model_dump()
            for conv in conversations
        ]
    )


@router.get("/{conversation_id}", response_model=dict)
async def get_conversation(
    conversation_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Get a specific conversation.

    :param conversation_id: conversation id
    :param session: database session
    :param current_user: current authenticated user
    :return: success response with conversation data
    """
    conversation_dao = ConversationDAO(session)
    conversation = await conversation_dao.get_conversation_by_id(
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # 获取属性（GET 请求不需要 commit，但为了一致性也提前获取）
    response_data = ConversationResponse(
        id=str(conversation.id),
        title=conversation.title,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )

    return success_response(data=response_data.model_dump())


@router.put("/{conversation_id}", response_model=dict)
async def update_conversation(
    conversation_id: int,
    conversation_data: ConversationUpdate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Update a conversation.

    :param conversation_id: conversation id
    :param conversation_data: conversation update data
    :param session: database session
    :param current_user: current authenticated user
    :return: success response with updated conversation data
    """
    conversation_dao = ConversationDAO(session)
    conversation = await conversation_dao.update_conversation_title(
        conversation_id=conversation_id,
        user_id=current_user.id,
        title=conversation_data.title,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # 在 commit 之前获取所有需要的属性，避免延迟加载问题
    response_data = ConversationResponse(
        id=str(conversation.id),
        title=conversation.title,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat(),
    )

    await session.commit()

    return success_response(data=response_data.model_dump())


@router.post("/{conversation_id}/delete", response_model=dict)
async def delete_conversation(
    conversation_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Delete a conversation.

    :param conversation_id: conversation id
    :param session: database session
    :param current_user: current authenticated user
    :return: success response
    """
    conversation_dao = ConversationDAO(session)
    deleted = await conversation_dao.delete_conversation(
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    await session.commit()

    return success_response(data={"message": "Conversation deleted successfully"})


@router.get("/{conversation_id}/messages", response_model=dict)
async def get_messages(
    conversation_id: int,
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Get all messages for a conversation.

    :param conversation_id: conversation id
    :param limit: max number of messages to return
    :param offset: offset for pagination
    :param session: database session
    :param current_user: current authenticated user
    :return: success response with list of messages
    """
    # Verify conversation ownership
    conversation_dao = ConversationDAO(session)
    conversation = await conversation_dao.get_conversation_by_id(
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    message_dao = MessageDAO(session)
    messages = await message_dao.get_conversation_messages(
        conversation_id=conversation_id,
        limit=limit,
        offset=offset,
    )

    return success_response(
        data=[
            MessageResponse(
                id=str(msg.id),
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at.isoformat(),
            ).model_dump()
            for msg in messages
        ]
    )


# ============================================
# Helper Functions for Stream Message
# ============================================


async def _generate_conversation_title(
    agent_base_url: str,
    user_question: str,
) -> str:
    """
    使用 Agent 生成对话标题。
    
    :param agent_base_url: Agent 服务地址
    :param user_question: 用户问题
    :return: 生成的标题
    """
    title_prompt = f"请根据以下用户问题生成一个简短的对话标题（不超过20个字，不要加引号）：\n\n{user_question}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{agent_base_url}/chat",
                json={"question": title_prompt}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("code") == 0:
                    data = result.get("data", {})
                    title = data.get("answer", "").strip().strip('"').strip("'").strip()
                    return title[:30] if len(title) > 30 else title
    except Exception:
        pass
    
    # Fallback: 使用问题前 20 个字符
    return user_question[:20] + ("..." if len(user_question) > 20 else "")


async def _handle_done_event(
    event_data: dict,
    assistant_content: str,
    conversation_id: int,
    user_question: str,
    message_dao: MessageDAO,
    conversation_dao: ConversationDAO,
    current_user: User,
    session: AsyncSession,
) -> tuple[str, dict]:
    """
    处理 done 事件：保存消息、生成标题。
    
    :return: (assistant_message_id, done_data)
    """
    final_answer = event_data.get("answer", assistant_content)
    
    # 保存助手消息
    assistant_message = await message_dao.create_message(
        conversation_id=conversation_id,
        role="assistant",
        content=final_answer,
    )
    
    # 如果是第一条消息，生成标题
    message_count = await message_dao.count_conversation_messages(conversation_id)
    if message_count == 2:
        title = await _generate_conversation_title(settings.agent_base_url, user_question)
        await conversation_dao.update_conversation_title(
            conversation_id=conversation_id,
            user_id=current_user.id,
            title=title,
        )
    
    await session.commit()
    
    done_data = {
        "message_id": str(assistant_message.id),
        "metadata": event_data.get("metadata", {})
    }
    
    return str(assistant_message.id), done_data


async def _handle_error_event(
    event_data: dict,
    conversation_id: int,
    message_dao: MessageDAO,
    session: AsyncSession,
) -> None:
    """
    处理 error 事件：保存错误消息。
    """
    error_msg = event_data.get("msg", "抱歉，AI 服务暂时不可用")
    await message_dao.create_message(
        conversation_id=conversation_id,
        role="assistant",
        content=error_msg,
    )
    await session.commit()


async def _save_error_message(
    conversation_id: int,
    error_msg: str,
    message_dao: MessageDAO,
    session: AsyncSession,
) -> None:
    """
    保存错误消息到数据库。
    """
    await message_dao.create_message(
        conversation_id=conversation_id,
        role="assistant",
        content=error_msg,
    )
    await session.commit()


def _format_sse_event(event_type: str, data: dict) -> str:
    """
    格式化 SSE 事件。
    """
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ============================================
# Main Stream Endpoint
# ============================================

@router.post("/messages/stream")
async def create_message_stream(
    message_data: MessageCreate,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    """
    流式创建消息（SSE 流式返回）。

    :param message_data: message creation data
    :param session: database session
    :param current_user: current authenticated user
    :return: SSE stream
    """
    conversation_id = int(message_data.conversation_id)

    # Verify conversation ownership
    conversation_dao = ConversationDAO(session)
    conversation = await conversation_dao.get_conversation_by_id(
        conversation_id=conversation_id,
        user_id=current_user.id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    message_dao = MessageDAO(session)

    # Create user message
    user_message = await message_dao.create_message(
        conversation_id=conversation_id,
        role="user",
        content=message_data.content,
    )
    await session.commit()

    # SSE 事件生成器
    async def event_generator():
        assistant_content = ""
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{settings.agent_base_url}/stream",
                    json={"question": message_data.content, "stream": True}
                ) as response:
                    
                    # 处理非 200 响应
                    if response.status_code != 200:
                        error_msg = f"Agent 服务错误: {response.status_code}"
                        yield _format_sse_event("error", {"code": response.status_code, "msg": error_msg})
                        await _save_error_message(conversation_id, error_msg, message_dao, session)
                        return
                    
                    # 解析 SSE 流
                    event_type = None
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        
                        # 解析 SSE 格式
                        if line.startswith("event: "):
                            event_type = line[7:].strip()
                        elif line.startswith("data: ") and event_type:
                            try:
                                event_data = json.loads(line[6:])
                                
                                # 转发事件给前端
                                yield _format_sse_event(event_type, event_data)
                                
                                # 处理不同事件类型
                                if event_type == "token":
                                    assistant_content += event_data.get("token", "")
                                
                                elif event_type == "done":
                                    _, done_data = await _handle_done_event(
                                        event_data,
                                        assistant_content,
                                        conversation_id,
                                        message_data.content,
                                        message_dao,
                                        conversation_dao,
                                        current_user,
                                        session,
                                    )
                                    yield _format_sse_event("done", done_data)
                                
                                elif event_type == "error":
                                    await _handle_error_event(event_data, conversation_id, message_dao, session)
                                    return
                            
                            except (json.JSONDecodeError, ValueError) as e:
                                print(f"⚠️ 解析事件失败: {e}, line: {line}")
                            
                            event_type = None
        
        except httpx.TimeoutException:
            yield _format_sse_event("error", {"code": 504, "msg": "Agent 服务超时"})
            await _save_error_message(conversation_id, "抱歉，服务超时，请稍后再试。", message_dao, session)
        
        except Exception as e:
            yield _format_sse_event("error", {"code": 500, "msg": f"服务器错误: {str(e)}"})
            await _save_error_message(conversation_id, f"抱歉，服务器错误：{str(e)}", message_dao, session)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        },
    )


