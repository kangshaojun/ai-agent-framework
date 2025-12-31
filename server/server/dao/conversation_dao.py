"""DAO for conversation and message operations."""

from typing import List, Optional

from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from server.models.conversation_model import Conversation, Message


class ConversationDAO:
    """Class for accessing conversation table."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_conversation(
        self,
        user_id: int,
        title: str = "新对话",
    ) -> Conversation:
        """
        Create a new conversation.

        :param user_id: user id
        :param title: conversation title
        :return: conversation object
        """
        conversation = Conversation(user_id=user_id, title=title)
        self.session.add(conversation)
        await self.session.flush()
        return conversation

    async def get_conversation_by_id(
        self,
        conversation_id: int,
        user_id: int,
    ) -> Optional[Conversation]:
        """
        Get conversation by id.

        :param conversation_id: conversation id
        :param user_id: user id to verify ownership
        :return: conversation object or None
        """
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .where(Conversation.user_id == user_id)
            .options(selectinload(Conversation.messages))
        )
        return result.scalar_one_or_none()

    async def get_user_conversations(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Conversation]:
        """
        Get all conversations for a user.

        :param user_id: user id
        :param limit: max number of conversations to return
        :param offset: offset for pagination
        :return: list of conversations
        """
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def update_conversation_title(
        self,
        conversation_id: int,
        user_id: int,
        title: str,
    ) -> Optional[Conversation]:
        """
        Update conversation title.

        :param conversation_id: conversation id
        :param user_id: user id to verify ownership
        :param title: new title
        :return: updated conversation or None
        """
        conversation = await self.get_conversation_by_id(conversation_id, user_id)
        if conversation:
            conversation.title = title
            await self.session.flush()
            # 刷新对象以获取数据库自动更新的 updated_at 字段
            await self.session.refresh(conversation)
        return conversation

    async def delete_conversation(
        self,
        conversation_id: int,
        user_id: int,
    ) -> bool:
        """
        Delete a conversation.

        :param conversation_id: conversation id
        :param user_id: user id to verify ownership
        :return: True if deleted, False otherwise
        """
        result = await self.session.execute(
            delete(Conversation)
            .where(Conversation.id == conversation_id)
            .where(Conversation.user_id == user_id)
        )
        return result.rowcount > 0


class MessageDAO:
    """Class for accessing message table."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
    ) -> Message:
        """
        Create a new message.

        :param conversation_id: conversation id
        :param role: message role (user or assistant)
        :param content: message content
        :return: message object
        """
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def get_conversation_messages(
        self,
        conversation_id: int,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Message]:
        """
        Get all messages for a conversation.

        :param conversation_id: conversation id
        :param limit: max number of messages to return
        :param offset: offset for pagination
        :return: list of messages
        """
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_message_by_id(
        self,
        message_id: int,
    ) -> Optional[Message]:
        """
        Get message by id.

        :param message_id: message id
        :return: message object or None
        """
        result = await self.session.execute(
            select(Message).where(Message.id == message_id)
        )
        return result.scalar_one_or_none()

    async def count_conversation_messages(
        self,
        conversation_id: int,
    ) -> int:
        """
        Count messages in a conversation.

        :param conversation_id: conversation id
        :return: number of messages
        """
        result = await self.session.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
        )
        return result.scalar() or 0
