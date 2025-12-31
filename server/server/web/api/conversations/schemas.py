"""Schemas for conversation and message API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# Conversation Schemas
class ConversationCreate(BaseModel):
    """Schema for creating a conversation."""

    title: Optional[str] = Field(default="新对话", max_length=255)


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation."""

    title: str = Field(..., max_length=255)


class ConversationResponse(BaseModel):
    """Schema for conversation response."""

    id: str
    title: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Message Schemas
class MessageCreate(BaseModel):
    """Schema for creating a message."""

    conversation_id: str
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    """Schema for message response."""

    id: str
    role: str
    content: str
    created_at: str

    class Config:
        from_attributes = True
