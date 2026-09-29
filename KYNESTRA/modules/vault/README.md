# Stock Vault

Stock Vault is the local asset library and publishing tracker.

Core behavior:
1. Receive completed render assets from C2M.
2. Store metadata and asset references locally.
3. Let the user mark an asset as submitted to a platform.
4. Check configured contributor or portfolio links using exact filename/title matching.
5. Track each platform independently.
6. Never infer rejection merely because an asset is not publicly found.

Vault is not limited to Shutterstock. Platform connectors are separate.
