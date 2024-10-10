from fastapi import Depends, FastAPI, HTTPException, status , WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from sqlalchemy import desc
import models
import schemas
import crud
import auth
import database
import data as d1
import notification
import asyncio
from kpi import calculate_kpis, get_num_failures_month

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL here
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Startup event to run KPI calculation
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(kpi_scheduler())
    
    
async def kpi_scheduler():
    while True:
        await calculate_kpis()
        await asyncio.sleep(9000)  # Sleep for 15 minutes

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires)
    print(access_token)
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/", response_model=schemas.User)
async def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_active_user)):
    return current_user

@app.get("/users/me/items")
async def read_own_items(current_user: schemas.User = Depends(auth.get_current_active_user)):
    return [{"item_id": 1, "owner": current_user}]

@app.get("/historical-data")
async def get_historical_data(machineId: int, plantId: int, timeframe: str = Query("5m")):
    try:
        data = await d1.get_historical_data(machineId, plantId, timeframe)
        return data
    except Exception as e:
        print(f"An error occurred while fetching historical data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching historical data")


@app.get("/machine-count")
async def get_machine_and_plant_count(current_user: dict = Depends(auth.get_current_active_user)):
    try:
        res = d1.get_distinct_machine_count()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/plant-count")
async def get_machine_and_plant_count(current_user: dict = Depends(auth.get_current_active_user)):
    try:
        res = d1.get_distinct_plant_count()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/notifications")
def get_notifications(db: Session = Depends(database.get_db)):
    notifications = db.query(models.Notification).order_by(desc(models.Notification.timestamp)).limit(100).all()
    return notifications


@app.get("/api/num-failures")
def get_failures_endpoint(month: int, year: int, machine_id: str, plant_id: str, db: Session = Depends(database.get_db)):
    return get_num_failures_month(db, month, year, machine_id, plant_id)


@app.websocket("/ws/data-stream")
async def websocket_endpoint(websocket: WebSocket, machineId: int = Query(...), plantId: int = Query(...)):
    await d1.send_data_to_client(websocket,machineId,plantId)
    
@app.websocket("/ws/notification-stream")
async def websocket_notification_endpoint(websocket: WebSocket):
    await notification.send_data_to_client(websocket)
    
    
@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down...")