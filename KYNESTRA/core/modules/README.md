# Module Registry

Core validates the built-in module manifests during desktop startup.

Current built-ins:

- c2m — Code Motion renderer
- forge — Format Forge converter
- vault — Stock Vault service

The registry is Core-owned. The shell consumes list_modules; modules do not directly discover or mutate one another.

Manifest contract:

KYNESTRA/core/modules/module-contract.json
