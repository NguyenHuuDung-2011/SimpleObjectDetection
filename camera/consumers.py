from channels.generic.websocket import AsyncWebsocketConsumer

class CameraConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Client connected")
        await self.accept()

    async def disconnect(self, close_code):
        print("Client disconnected")