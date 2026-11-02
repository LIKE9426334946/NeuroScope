"""Serve the layer definition used to build the browser's mock network."""
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI
from pydantic import BaseModel, Field, PositiveInt

Dimension = Annotated[int, Field(strict=True, ge=1, le=30)]


class Layer(BaseModel):
    id: PositiveInt
    shape: Annotated[list[Dimension], Field(min_length=1, max_length=3)]


class Network(BaseModel):
    layers: Annotated[list[Layer], Field(min_length=1)]


config_path = Path(__file__).resolve().parents[1] / "shared" / "network.json"
preset = Network.model_validate_json(config_path.read_text(encoding="utf-8"))
app = FastAPI(title="NeuroScope", version="1.0.0", docs_url="/api/docs", redoc_url=None,
              openapi_url="/api/openapi.json")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "NeuroScope"}


@app.get("/api/network", response_model=Network)
def network() -> Network:
    return preset
