def restaurant_schema(restaurant) -> dict:
    return {
        "id": str(restaurant["_id"]),
        "name": restaurant.get("name", ""),
        "city": restaurant.get("city", ""),
        "cuisine": restaurant.get("cuisine", ""),
        "rating": restaurant.get("rating", 0.0),
        "is_active": restaurant.get("is_active", True),
        "menu": restaurant.get("menu", [])
    }

def restaurants_schema(restaurants) -> list:
    return [restaurant_schema(restaurant) for restaurant in restaurants]