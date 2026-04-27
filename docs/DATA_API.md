# 🔌 APIs

## Services
* GET `/departments`
* GET `/departments/:id/services`

## Documents
* GET `/services/:id/documents`

## Upload
* POST `/upload`
  → returns:
```json
{
  "detectedType": "aadhaar",
  "status": "DETECTED"
}
```
