# Brightloop Software — Subscription Management System

[](https://www.djangoproject.com/)
[](https://react.dev/)
[](https://tailwindcss.com/)
[](https://www.framer.com/motion/)
[](https://hackathon.odoo.com/)

> An atmospheric, role-aware subscription and recurring billing platform engineered with **Django REST Framework** and **React (Vite) Liquid Glass UI**. Built for the **Odoo Hackathon 2026**.

---

## 🌟 Executive Summary

Before Brightloop, organizations managed recurring revenue through fragmented spreadsheets: renewals were forgotten, manual invoices produced errors, and calculating Monthly Recurring Revenue (MRR) took days. 

**Brightloop** replaces this chaos with a unified, role-aware digital backbone running the full lifecycle of a subscription business—from product catalog setup with dynamic variants to quotation templates, automated 1-click billing day execution with zero double-billing, and real-time sub-2-second financial telemetry.

---

## 🚀 Key Scenes & Implementation Matrix

Our solution directly implements all 7 core scenarios mandated by the Odoo Hackathon specification:

| Scene | Business Requirement | Implemented Technical Architecture |
| :--- | :--- | :--- |
| **Scene 1: Auth & RBAC** | Unique emails, strict password validation, reset link/OTP, Admin, Staff, and Customer segregation. | Custom `UserAccount` & `OtpCode` models, regex password validator (>8 chars, uppercase, lowercase, special char), and Gmail SMTP 6-digit OTP dispatch. |
| **Scene 2: Plans & Variants** | Products with variants (Odoo brand adds +560), flexible frequencies, auto-close/renew guards. | `ProductVariant` relational schema with dynamic `price_extra`, `Plan` model rules enforcing pause, renewal, and auto-close limits. |
| **Scene 3: Quote to Subscription** | Quotation templates, validity days, lifecycle: Draft → Quotation → Confirmed → Active → Closed. | `QuotationTemplate` cloning engine, state-machine transitions with active lifecycle progression and contract pause/resume controls. |
| **Scene 4: Billing Day Engine** | 1-Click batch billing, auto tax calculation, customer line snapshot, duplicate prevention. | Batch invoicing pipeline with unique `(subscription_id, billing_cycle_key)` compound constraints and automated 18% GST calculation. |
| **Scene 5: Smart Discounts** | Fixed/percentage discounts, usage limits, minimum purchase/qty, automatic invoice application. | `DiscountRule` engine validating expiration dates and usage thresholds before auto-decrementing available quotas on subsequent invoices. |
| **Scene 6: Payment Tracking** | Multi-method settlement (UPI, Wire, Card), tracking Paid vs Outstanding and Overdue debt. | `Payment` ledger linked to invoices, automatic transition to `Paid` upon full settlement, and overdue debt chasing indicators. |
| **Scene 7: Finance Telemetry** | Fast summary view of active subscriptions, revenue, and overdue invoices in under 2 seconds. | Zero-latency cached database aggregation calculating MRR, Active Contracts, Collected Revenue, and Overdue Debt in real time. |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REACT 19 LIQUID GLASS FRONTEND                       │
│  ┌────────────────────┐ ┌────────────────────┐ ┌─────────────────────┐  │
│  │   Welcome Portal   │ │  Operations Hub    │ │ Invoicing & Finance │  │
│  │ (OTP Auth & RBAC)  │ │ (Lifecycle Studio) │ │ (Billing Day & Pay) │  │
│  └─────────┬──────────┘ └─────────┬──────────┘ └──────────┬──────────┘  │
└────────────┼──────────────────────┼───────────────────────┼─────────────┘
             │ Axios REST API       │ JSON Data             │ Fast Sync
┌────────────▼──────────────────────▼───────────────────────▼─────────────┐
│                    DJANGO 5 REST FRAMEWORK BACKEND                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Endpoints: /api/auth/, /api/subscriptions/, /api/billing/, etc.   │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│  ┌─────────────────┐ ┌─────────────▼─────────┐ ┌─────────────────────┐  │
│  │ Gmail SMTP OTP  │ │ ACID Transaction ORM  │ │  Billing Day Engine │  │
│  └─────────────────┘ └─────────────┬─────────┘ └─────────────────────┘  │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                       SQLITE3 RELATIONAL DATABASE                       │
│  Users • Products • Variants • Plans • Subscriptions • Invoices • Payments│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack Breakdown

### Frontend Layer
- **Framework:** React 19 (Vite)
- **Styling:** Tailwind CSS v4 + Vanilla CSS Custom Properties
- **Motion & Physics:** Framer Motion (Liquid Glass pill spring animation via `layoutId`, modal gestures)
- **Icons:** Lucide React
- **HTTP Client:** Axios with centralized interceptors

### Backend Layer
- **Framework:** Django 5.x + Django REST Framework (DRF)
- **Database:** SQLite3 with relational integrity and index optimization
- **Email Delivery:** Django Core Mail SMTP Backend (TLS Port 587)
- **CORS Management:** `django-cors-headers` (Full pre-flight compatibility)

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 2. Repository Cloning
```bash
git clone https://github.com/suhanikumari15038/hackathon.git
cd hackathon
```

### 3. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
*Backend server runs at `http://127.0.0.1:8000/`.*

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend interface runs at `http://localhost:5173/`.*

---

## 📡 REST API Reference

| Endpoint | Method | Role | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/send-otp/` | `POST` | Public | Generates and dispatches a 6-digit verification code via Gmail SMTP. |
| `/api/auth/register-otp/` | `POST` | Public | Validates OTP and strict password policy to register a user. |
| `/api/auth/login/` | `POST` | Public | Authenticates credentials and returns user identity and role. |
| `/api/bootstrap/` | `GET` | All | Role-filtered data payload (Metrics, Subscriptions, Invoices, Catalog). |
| `/api/subscriptions/<id>/stage/` | `POST` | Staff/Admin | Moves subscription across lifecycle (`Draft` → `Quotation` → `Confirmed` → `Active` → `Closed`). |
| `/api/subscriptions/<id>/pause/` | `POST` | All | Toggles contract pause/resume state per plan permissions. |
| `/api/billing/run/` | `POST` | Staff/Admin | Executes 1-click batch invoicing for due subscriptions with duplicate guards. |
| `/api/invoices/<id>/pay/` | `POST` | All | Records settlement (UPI, Wire, Card) and transitions status to `Paid`. |
| `/api/admin/create-entity/` | `POST` | Admin | Launches new products (with Odoo variant +₹560) or smart discount rules. |

---

## 👥 Team Brightloop

Engineered with passion for the **Odoo Hackathon 2026**:

- **Suhani Kumari** — *Team Lead, Project Architecture & Liquid Glass Design System*
- **Arnab Pandey** — *Backend Core, Relational Models & OTP Security Engine*
- **Divyansh** — *Billing Day Engine, Invoicing Workflows & Payment Processing*
- **Rohit** — *Lifecycle Studio, Printable Views & Documentation*

---

## 📄 License
This project is open-source under the [MIT License](https://www.google.com/search?q=LICENSE).
