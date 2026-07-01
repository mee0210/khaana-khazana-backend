from fastapi import APIRouter, HTTPException, Depends
from db.connect import get_database
from models.restaurant import Restaurant, UpdateRestaurant, MenuItem, UpdateMenuItem
from schemas.restaurant import restaurant_schema, restaurants_schema
from auth import get_current_user
from bson import ObjectId

router = APIRouter(dependencies=[Depends(get_current_user)])
db = get_database()

@router.get("/restaurants")
async def get_all_restaurants():
    restaurants = await db["restaurants"].find().to_list(100)
    return restaurants_schema(restaurants)

@router.get("/restaurants/{id}")
async def get_restaurant(id: str):
    restaurant = await db["restaurants"].find_one({"_id": ObjectId(id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant_schema(restaurant)

@router.post("/restaurants")
async def create_restaurant(restaurant: Restaurant):
    result = await db["restaurants"].insert_one(restaurant.dict())
    new = await db["restaurants"].find_one({"_id": result.inserted_id})
    return restaurant_schema(new)

@router.put("/restaurants/{id}")
async def update_restaurant(id: str, restaurant: UpdateRestaurant):
    data = {k: v for k, v in restaurant.dict().items() if v is not None}
    result = await db["restaurants"].update_one({"_id": ObjectId(id)}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    updated = await db["restaurants"].find_one({"_id": ObjectId(id)})
    return restaurant_schema(updated)

@router.delete("/restaurants/{id}")
async def delete_restaurant(id: str):
    result = await db["restaurants"].delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return {"message": "Restaurant deleted successfully"}

# --- Menu Endpoints ---

@router.get("/restaurants/{id}/menu")
async def get_menu(id: str):
    restaurant = await db["restaurants"].find_one({"_id": ObjectId(id)})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    menu = restaurant.get("menu", [])
    # Contract: { itemId, name, price, available: true/false }
    return [{"itemId": item.get("itemId"), "name": item.get("name"), "price": item.get("price"), "available": item.get("available")} for item in menu]

@router.post("/restaurants/{id}/menu")
async def add_menu_item(id: str, item: MenuItem):
    item.restaurant_id = id
    result = await db["restaurants"].update_one(
        {"_id": ObjectId(id)},
        {"$push": {"menu": item.dict()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    updated = await db["restaurants"].find_one({"_id": ObjectId(id)})
    return restaurant_schema(updated)

@router.put("/restaurants/{id}/menu/{itemId}")
async def update_menu_item(id: str, itemId: str, item_update: UpdateMenuItem):
    data = {f"menu.$.{k}": v for k, v in item_update.dict().items() if v is not None}
    if not data:
        return {"message": "No fields to update"}
    
    result = await db["restaurants"].update_one(
        {"_id": ObjectId(id), "menu.itemId": itemId},
        {"$set": data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found or unchanged")
    return {"message": "Menu item updated successfully"}

@router.delete("/restaurants/{id}/menu/{itemId}")
async def delete_menu_item(id: str, itemId: str):
    result = await db["restaurants"].update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"menu": {"itemId": itemId}}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted successfully"}

# --- Search Endpoint ---

@router.get("/search")
async def search_restaurants(cuisine: str = None, city: str = None, min_rating: float = None):
    query = {}
    if cuisine:
        query["cuisine"] = {"$regex": cuisine, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_rating is not None:
        query["rating"] = {"$gte": min_rating}
        
    restaurants = await db["restaurants"].find(query).to_list(100)
    return restaurants_schema(restaurants)

# --- Offers Endpoint ---

@router.get("/offers")
async def get_offers():
    """Generate promotional offers from existing restaurants."""
    restaurants = await db["restaurants"].find().to_list(100)
    offers = []
    offer_templates = [
        {"discount": 40, "code": "FEAST40", "description": "Flat 40% OFF on your first order", "min_order": 199, "max_discount": 120, "badge": "New User"},
        {"discount": 25, "code": "TASTY25", "description": "25% OFF up to ₹150", "min_order": 299, "max_discount": 150, "badge": "Popular"},
        {"discount": 20, "code": "YUM20", "description": "20% OFF on orders above ₹500", "min_order": 500, "max_discount": 200, "badge": "Best Value"},
        {"discount": 50, "code": "MEGA50", "description": "Flat 50% OFF up to ₹100", "min_order": 149, "max_discount": 100, "badge": "Mega Deal"},
        {"discount": 30, "code": "SAVE30", "description": "30% OFF + Free Delivery", "min_order": 399, "max_discount": 180, "badge": "Free Delivery"},
        {"discount": 15, "code": "SNACK15", "description": "15% OFF on all snacks & beverages", "min_order": 99, "max_discount": 75, "badge": "Snacks"},
    ]
    for i, rest in enumerate(restaurants):
        template = offer_templates[i % len(offer_templates)]
        offers.append({
            "id": str(rest["_id"]),
            "restaurantId": str(rest["_id"]),
            "restaurantName": rest.get("name", "Restaurant"),
            "cuisine": rest.get("cuisine", "Multi-Cuisine"),
            "rating": rest.get("rating", 4.0),
            **template
        })
    return offers