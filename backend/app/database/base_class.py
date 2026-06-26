import re
from typing import Any
from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    id: Any
    __name__: str

    # Generate __tablename__ automatically in snake_case format
    @declared_attr
    def __tablename__(cls) -> str:
        name = cls.__name__
        # Convert CamelCase to snake_case
        pattern = re.compile(r'(?<!^)(?=[A-Z])')
        return pattern.sub('_', name).lower()
