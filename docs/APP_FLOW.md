# 🔄 USER WORKFLOW (Simplified MVP)

### 🧭 Entry → Action → Output Flow

```
User lands on Dashboard
        ↓
Clicks "Services" in Sidebar
        ↓
Sees list of Departments (RTO, Passport, etc.)
        ↓
Selects a Service (e.g., New Car Registration)
        ↓
System shows Required Documents
        ↓
User uploads documents one by one
        ↓
System performs Basic Verification:
    - File type check
    - Filename keyword match
    - (Optional) OCR keyword detection
        ↓
System marks each document:
    - Detected as Aadhaar / PAN / Unknown
        ↓
User sees status per document
        ↓
User can re-upload if incorrect
```

---

## 🧠 Key Product Behavior

* ❌ No application submission
* ❌ No govt approval workflow
* ❌ No status tracking beyond upload
* ✅ Only:
  * Service discovery
  * Document requirements
  * Upload + basic classification
