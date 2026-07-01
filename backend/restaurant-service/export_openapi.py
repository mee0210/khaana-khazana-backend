from main import app
import json

with open("openapi.json", "w") as file:
    json.dump(app.openapi(), file, indent=4)

print("OpenAPI specification exported successfully!")