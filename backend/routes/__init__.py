from importlib import import_module

# Importa routers individuales para que queden accesibles como attributes
for mod in ("auth", "faces", "persons"):
    import_module(f"routes.{mod}")
