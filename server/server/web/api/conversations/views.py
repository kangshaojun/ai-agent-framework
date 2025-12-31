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

    # SSE 事件生成器 - 直接调用 Agent HTTP SSE 接口
    async def event_generator():
        assistant_content = ""
        sources_data = None
        agent_base_url = "http://localhost:8001"  # Agent 服务地址
        
        try:
            # 直接调用 Agent 的 HTTP SSE 接口
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{agent_base_url}/stream",
                    json={"question": message_data.content, "stream": True}
                ) as response:
                    
                    if response.status_code != 200:
                        error_msg = f"Agent 服务错误: {response.status_code}"
                        yield f"event: error\ndata: {json.dumps({'code': response.status_code, 'msg': error_msg}, ensure_ascii=False)}\n\n"
                        
                        # 保存错误消息
                        assistant_message = await message_dao.create_message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content=error_msg,
                        )
                        await session.commit()
                        return
                    
                    # 解析 SSE 流
                    event_type = None
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        
                        # 解析 SSE 格式
                        if line.startswith("event: "):
                            event_type = line[7:].strip()
                        elif line.startswith("data: "):
                            if event_type:
                                try:
                                    event_data = json.loads(line[6:])
                                    
                                    # 转发事件给前端
                                    yield f"event: {event_type}\ndata: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                                    
                                    # 处理不同事件类型
                                    if event_type == "token":
                                        token = event_data.get("token", "")
                                        assistant_content += token
                                    
                                    elif event_type == "sources":
                                        sources_data = event_data
                                    
                                    elif event_type == "done":
                                        # 完成，保存助手消息
                                        final_answer = event_data.get("answer", assistant_content)
                                        
                                        # Create assistant message
                                        assistant_message = await message_dao.create_message(
                                            conversation_id=conversation_id,
                                            role="assistant",
                                            content=final_answer,
                                        )
                                        
                                        # Check if this is the first message, if so, generate a title
                                        message_count = await message_dao.count_conversation_messages(conversation_id)
                                        if message_count == 2:  # user message + assistant message
                                            # Generate title using Agent HTTP service
                                            try:
                                                title_prompt = f"请根据以下用户问题生成一个简短的对话标题（不超过20个字，不要加引号）：\n\n{message_data.content}"
                                                async with httpx.AsyncClient(timeout=30.0) as title_client:
                                                    title_response = await title_client.post(
                                                        f"{agent_base_url}/chat",
                                                        json={"question": title_prompt}
                                                    )
                                                    
                                                    if title_response.status_code == 200:
                                                        title_result = title_response.json()
                                                        if title_result.get("code") == 0:
                                                            data = title_result.get("data", {})
                                                            generated_title = data.get("answer", "")
                                                            generated_title = generated_title.strip().strip('"').strip("'").strip()
                                                            if len(generated_title) > 30:
                                                                generated_title = generated_title[:30]
                                                            
                                                            await conversation_dao.update_conversation_title(
                                                                conversation_id=conversation_id,
                                                                user_id=current_user.id,
                                                                title=generated_title,
                                                            )
                                                        else:
                                                            raise Exception("Title generation failed")
                                                    else:
                                                        raise Exception(f"Agent service error: {title_response.status_code}")
                                            except Exception as e:
                                                # Fallback to using first 20 chars of question
                                                fallback_title = message_data.content[:20] + ("..." if len(message_data.content) > 20 else "")
                                                await conversation_dao.update_conversation_title(
                                                    conversation_id=conversation_id,
                                                    user_id=current_user.id,
                                                    title=fallback_title,
                                                )
                                        
                                        await session.commit()
                                        
                                        # 发送完成事件（带上 message_id）
                                        done_data = {
                                            "message_id": str(assistant_message.id),
                                            "metadata": event_data.get("metadata", {})
                                        }
                                        yield f"event: done\ndata: {json.dumps(done_data, ensure_ascii=False)}\n\n"
                                    
                                    elif event_type == "error":
                                        # 错误处理
                                        error_msg = event_data.get("msg", "抱歉，AI 服务暂时不可用")
                                        assistant_message = await message_dao.create_message(
                                            conversation_id=conversation_id,
                                            role="assistant",
                                            content=error_msg,
                                        )
                                        await session.commit()
                                        return
                                
                                except (json.JSONDecodeError, ValueError) as e:
                                    print(f"⚠️ 解析事件失败: {e}, line: {line}")
                                
                                # 重置 event_type
                                event_type = None
        
        except httpx.TimeoutException:
            error_data = {"code": 504, "msg": "Agent 服务超时"}
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            
            assistant_message = await message_dao.create_message(
                conversation_id=conversation_id,
                role="assistant",
                content="抱歉，服务超时，请稍后再试。",
            )
            await session.commit()
        
        except Exception as e:
            # 异常处理
            error_data = {
                "code": 500,
                "msg": f"服务器错误: {str(e)}"
            }
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            
            # 保存错误消息
            assistant_message = await message_dao.create_message(
                conversation_id=conversation_id,
                role="assistant",
                content=f"抱歉，服务器错误：{str(e)}",
            )
            await session.commit()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        },
    )


