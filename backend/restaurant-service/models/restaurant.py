from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import uuid

class CategoryEnum(str, Enum):
    STARTER = "STARTER"
    MAIN_COURSE = "MAIN_COURSE"
    DESSERT = "DESSERT"
    BEVERAGE = "BEVERAGE"

class MenuItem(BaseModel):
    itemId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str = ""
    name: str
    price: float = Field(gt=0)
    category: CategoryEnum
    available: bool = True

class Restaurant(BaseModel):
    name: str
    city: str
    cuisine: str
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    is_active: bool = True
    menu: List[MenuItem] = []

class UpdateRestaurant(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    cuisine: Optional[str] = None
    rating: Optional[float] = Field(default=None, ge=0.0, le=5.0)
    is_active: Optional[bool] = None

class UpdateMenuItem(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    category: Optional[CategoryEnum] = None
    available: Optional[bool] = None