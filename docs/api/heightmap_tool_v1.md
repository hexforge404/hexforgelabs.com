# Heightmap Tool API Contract (v1)

## Endpoint
POST /tool/heightmap  
Content-Type: multipart/form-data

## Fields
- image (file) REQUIRED
- name (string) default "hexforge"
- mode (string) default "relief"
- size_mm (int) default 80
- thickness (float) default 2.0
- max_height (float) default 4.0
- invert (bool) default true

## Success (200)
Response MUST include:
- ok: true
- received: { filename, bytes, mode, max_height, invert, size_mm, thickness, name }
- used_kwargs: object (only kwargs accepted by engine)
- result: object containing:
  - heightmap: string path
  - stl: string path
  - previews: { iso, top, front }
  - manifest: string path
Optional:
- warnings: string[]

## Errors
- 400: { "detail": "<validation message>" }
- 500: { "detail": "Heightmap generation failed: <message>" }
