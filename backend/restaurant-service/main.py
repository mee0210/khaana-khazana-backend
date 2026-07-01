from fastapi import FastAPI
from routers.restaurant import router
from prometheus_fastapi_instrumentator import Instrumentator
from db.connect import get_database
import pymongo

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create text indexes for search on startup
    db = get_database()
    await db["restaurants"].create_index([("name", pymongo.TEXT), ("cuisine", pymongo.TEXT)])
    
    # Auto-seed sample restaurants if MongoDB collection is empty
    count = await db["restaurants"].count_documents({})
    if count == 0:
        print("MongoDB is empty! Seeding default restaurants and menus...")
        seed_data = [
            {
                "name": "Odisha Kitchen",
                "city": "Bhubaneswar",
                "cuisine": "Odia / Indian",
                "rating": 4.8,
                "is_active": True,
                "menu": [
                    { "itemId": "ok1", "restaurant_id": "", "name": "Dahi Bara Alu Dum", "price": 80.00, "category": "STARTER", "available": True },
                    { "itemId": "ok2", "restaurant_id": "", "name": "Authentic Dalma", "price": 110.00, "category": "STARTER", "available": True },
                    { "itemId": "ok3", "restaurant_id": "", "name": "Odia Mutton Kasa", "price": 340.00, "category": "MAIN_COURSE", "available": True },
                    { "itemId": "ok4", "restaurant_id": "", "name": "Chhena Poda", "price": 90.00, "category": "DESSERT", "available": True },
                    { "itemId": "ok5", "restaurant_id": "", "name": "Sweet Lassi", "price": 60.00, "category": "BEVERAGE", "available": True }
                ]
            },
            {
                "name": "Temple City Bites",
                "city": "Bhubaneswar",
                "cuisine": "Indo-Chinese / Fast Food",
                "rating": 4.4,
                "is_active": True,
                "menu": [
                    { "itemId": "tc1", "restaurant_id": "", "name": "Paneer Tikka Roll", "price": 120.00, "category": "STARTER", "available": True },
                    { "itemId": "tc2", "restaurant_id": "", "name": "Veg Hakka Noodles", "price": 160.00, "category": "MAIN_COURSE", "available": True },
                    { "itemId": "tc3", "restaurant_id": "", "name": "Chilli Chicken", "price": 210.00, "category": "MAIN_COURSE", "available": True },
                    { "itemId": "tc4", "restaurant_id": "", "name": "Hot Chocolate Fudge", "price": 130.00, "category": "DESSERT", "available": True },
                    { "itemId": "tc5", "restaurant_id": "", "name": "Cold Coffee", "price": 80.00, "category": "BEVERAGE", "available": True }
                ]
            },
            {
                "name": "Pizza Palace",
                "city": "Pune",
                "cuisine": "Italian",
                "rating": 4.5,
                "is_active": True,
                "menu": [
                    { "itemId": "p1", "restaurant_id": "", "name": "Margherita Pizza", "price": 199.00, "category": "MAIN_COURSE", "available": True },
                    { "itemId": "p2", "restaurant_id": "", "name": "Garlic Bread", "price": 99.00, "category": "STARTER", "available": True },
                    { "itemId": "p3", "restaurant_id": "", "name": "Tiramisu", "price": 150.00, "category": "DESSERT", "available": True },
                    { "itemId": "p4", "restaurant_id": "", "name": "Coca Cola", "price": 40.00, "category": "BEVERAGE", "available": True }
                ]
            }
        ]
        await db["restaurants"].insert_many(seed_data)
        print("Database seeded successfully! 🎉")
    yield

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Restaurant Service",
    description="Manages menu data and search for Khaana Khazana food delivery platform",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1", tags=["Restaurants"])

Instrumentator().instrument(app).expose(app)

@app.get("/")
async def root():
    return {"message": "Restaurant Service is running!"}

@app.get("/health")
async def health():
    return {
        "status": "UP",
        "service": "Restaurant Service",
        "version": "1.0.0"
    }