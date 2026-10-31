import re
import random
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import (
    UserAccount, OtpCode, Product, ProductVariant, Plan, TaxRule,
    DiscountRule, QuotationTemplate, Subscription, SubscriptionLine,
    Invoice, Payment
)

def validate_pw(pw):
    if len(pw) <= 8:
        return False, "Password must be more than 8 characters."
    if not re.search(r'[A-Z]', pw):
        return False, "Password must have at least one uppercase letter (A-Z)."
    if not re.search(r'[a-z]', pw):
        return False, "Password must have at least one lowercase letter (a-z)."
    if not re.search(r'[^A-Za-z0-9]', pw):
        return False, "Password must have at least one special character (!@#$%^&*)."
    return True, "Valid"

@api_view(['POST'])
def send_otp(request):
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({"error": "Email address is required."}, status=400)
    
    code = f"{random.randint(100000, 999999)}"
    OtpCode.objects.filter(email=email).delete()
    OtpCode.objects.create(email=email, code=code)

    print(f"\n=======================================================")
    print(f"🔑 [BRIGHTLOOP OTP SUCCESS] -> {email}")
    print(f"⚡ YOUR 6-DIGIT CODE IS: {code}")
    print(f"=======================================================\n")

    try:
        send_mail(
            subject='[Brightloop] Security Verification OTP',
            message=f'Hello,\n\nYour Brightloop 6-digit OTP is: {code}\n\nValid for 10 minutes.\n\nBrightloop Software',
            from_email='warmitul48@gmail.com',
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"SMTP Log: {e}")

    return Response({
        "success": True,
        "message": f"OTP successfully dispatched to {email}!",
        "otp": code
    }, status=200)

@api_view(['POST'])
def register_with_otp(request):
    data = request.data
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()
    company = data.get('company_name', '')
    role = data.get('role', 'customer')
    otp_entered = (data.get('otp') or '').strip()

    if not email or not name or not password or not otp_entered:
        return Response({"error": "All fields including OTP are required."}, status=400)
    if UserAccount.objects.filter(email=email).exists():
        return Response({"error": "This email is already registered."}, status=400)

    ok, msg = validate_pw(password)
    if not ok:
        return Response({"error": msg}, status=400)

    otp_obj = OtpCode.objects.filter(email=email).order_by('-created_at').first()
    if not otp_obj or not otp_obj.is_valid() or otp_obj.code != otp_entered:
        return Response({"error": "Invalid or expired OTP code."}, status=400)

    user = UserAccount.objects.create(
        name=name, company_name=company or 'Brightloop Direct',
        email=email, password_hash=password, role=role, is_verified=True
    )
    otp_obj.delete()
    return Response({
        "message": f"Account verified successfully for {user.name} ({user.role.upper()})!",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "company": user.company_name}
    })

@api_view(['POST'])
def login_user(request):
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    user = UserAccount.objects.filter(email=email, password_hash=password).first()
    if not user:
        return Response({"error": "Invalid email or password."}, status=401)
    return Response({
        "message": f"Welcome back, {user.name}!",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "company": user.company_name}
    })

@api_view(['GET'])
def bootstrap_data(request):
    role = request.query_params.get('role', 'admin')
    user_id = request.query_params.get('user_id')
    today = timezone.now().date()

    sub_qs = Subscription.objects.select_related('customer', 'plan', 'discount_rule').prefetch_related('lines__product', 'lines__variant').order_by('-id')
    inv_qs = Invoice.objects.select_related('customer', 'subscription').prefetch_related('payments').order_by('-id')

    if role == 'customer' and user_id:
        sub_qs = sub_qs.filter(customer_id=user_id)
        inv_qs = inv_qs.filter(customer_id=user_id)

    subscriptions = []
    for s in sub_qs:
        lines = []
        tot = Decimal("0.00")
        for ln in s.lines.all():
            lines.append({
                "id": ln.id, "product_name": ln.product.name,
                "variant": f"{ln.variant.attribute_value} (+₹{ln.variant.price_extra})" if ln.variant else "Standard",
                "quantity": ln.quantity, "amount": float(ln.amount)
            })
            tot += ln.amount
        subscriptions.append({
            "id": s.id, "subscription_number": s.subscription_number,
            "customer_name": s.customer.name, "company_name": s.customer.company_name,
            "plan_name": s.plan.name, "stage": s.stage, "is_paused": s.is_paused,
            "expiry_date": str(s.expiry_date), "allow_pause": s.plan.allow_pause,
            "allow_renew": s.plan.allow_renew, "allow_early_close": s.plan.allow_early_close,
            "total_amount": float(tot), "lines": lines
        })

    invoices = []
    for inv in inv_qs:
        is_overdue = (inv.status == 'Confirmed' and inv.due_date < today and inv.amount_paid < inv.total_amount)
        invoices.append({
            "id": inv.id, "invoice_number": inv.invoice_number,
            "customer_name": inv.customer.name, "due_date": str(inv.due_date),
            "subtotal": float(inv.subtotal), "discount_amount": float(inv.discount_amount),
            "tax_amount": float(inv.tax_amount), "total_amount": float(inv.total_amount),
            "amount_paid": float(inv.amount_paid),
            "balance_due": float(max(Decimal("0.00"), inv.total_amount - inv.amount_paid)),
            "status": inv.status, "is_overdue": is_overdue,
            "payments": [{"method": p.method, "amount": float(p.amount), "date": str(p.payment_date), "note": p.note} for p in inv.payments.all()]
        })

    active_count = sum(1 for s in subscriptions if s['stage'] == 'Active' and not s['is_paused'])
    mrr = sum(s['total_amount'] for s in subscriptions if s['stage'] == 'Active' and not s['is_paused'])
    collected = sum(inv['amount_paid'] for inv in invoices if inv['status'] != 'Cancelled')
    outstanding = sum(inv['balance_due'] for inv in invoices if inv['status'] == 'Confirmed')
    overdue_count = sum(1 for inv in invoices if inv['is_overdue'])

    products = [{"id": p.id, "name": p.name, "price": float(p.sales_price)} for p in Product.objects.all()]
    plans = [{"id": pl.id, "name": pl.name, "period": pl.billing_period, "price": float(pl.base_price)} for pl in Plan.objects.all()]
    discounts = [{"id": d.id, "code": d.code, "value": float(d.value), "type": d.discount_type, "limit": d.usage_limit, "used": d.times_used} for d in DiscountRule.objects.all()]

    return Response({
        "metrics": {
            "active_subscriptions": active_count, "mrr": round(mrr, 2),
            "collected_revenue": round(collected, 2), "outstanding_revenue": round(outstanding, 2),
            "overdue_invoices": overdue_count
        },
        "subscriptions": subscriptions, "invoices": invoices,
        "products": products, "plans": plans, "discounts": discounts
    })

@api_view(['POST'])
def change_sub_stage(request, sub_id):
    sub = Subscription.objects.get(id=sub_id)
    next_stage = request.data.get('stage')
    if next_stage in ['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed']:
        sub.stage = next_stage
        if next_stage == 'Active':
            sub.is_paused = False
        sub.save()
        return Response({"message": f"{sub.subscription_number} moved to {sub.stage}!"})
    return Response({"error": "Invalid stage."}, status=400)

@api_view(['POST'])
def toggle_sub_pause(request, sub_id):
    sub = Subscription.objects.get(id=sub_id)
    sub.is_paused = not sub.is_paused
    sub.save()
    status_txt = "Paused" if sub.is_paused else "Resumed"
    return Response({"message": f"{sub.subscription_number} is now {status_txt}."})

@api_view(['POST'])
def run_billing_day(request):
    today = timezone.now().date()
    cycle_key = today.strftime('%Y-%m')
    active_subs = Subscription.objects.filter(stage='Active', is_paused=False).select_related('customer', 'discount_rule').prefetch_related('lines__product', 'lines__variant')

    created = 0
    skipped = 0

    for sub in active_subs:
        if Invoice.objects.filter(subscription=sub, billing_cycle_key=cycle_key).exists():
            skipped += 1
            continue

        subtotal = sum(ln.amount for ln in sub.lines.all())
        discount_amt = Decimal("0.00")
        disc = sub.discount_rule
        if disc and disc.is_active and disc.times_used < disc.usage_limit:
            if disc.discount_type == 'percentage':
                discount_amt = (subtotal * disc.value) / Decimal("100.00")
            else:
                discount_amt = min(subtotal, disc.value)
            disc.times_used += 1
            disc.save()

        taxable = max(Decimal("0.00"), subtotal - discount_amt)
        tax_amt = (taxable * Decimal("18.00")) / Decimal("100.00")
        total = taxable + tax_amt

        inv_num = f"INV-2026-{Invoice.objects.count() + 101}"
        Invoice.objects.create(
            invoice_number=inv_num, subscription=sub, customer=sub.customer,
            billing_cycle_key=cycle_key, issue_date=today, due_date=today + timedelta(days=15),
            subtotal=round(subtotal, 2), discount_amount=round(discount_amt, 2),
            tax_amount=round(tax_amt, 2), total_amount=round(total, 2),
            amount_paid=Decimal("0.00"), status="Confirmed"
        )
        created += 1

    return Response({
        "message": f"Billing Day Execution Finished: {created} invoices generated, {skipped} duplicate invoices skipped automatically!"
    })

@api_view(['POST'])
def record_payment(request, inv_id):
    inv = Invoice.objects.get(id=inv_id)
    amount = Decimal(str(request.data.get('amount', inv.total_amount - inv.amount_paid)))
    method = request.data.get('method', 'UPI / QR')
    note = request.data.get('note', 'Settlement verified')

    Payment.objects.create(invoice=inv, method=method, amount=amount, note=note)
    inv.amount_paid += amount
    if inv.amount_paid >= inv.total_amount:
        inv.status = 'Paid'
    inv.save()

    return Response({"message": f"Payment of ₹{amount} recorded via {method}. Invoice is now {inv.status}!"})

@api_view(['POST'])
def admin_create_entity(request):
    kind = request.data.get('kind')
    if kind == 'product':
        p = Product.objects.create(
            name=request.data['name'], sales_price=Decimal(str(request.data['price'])),
            cost_price=Decimal("500.00"), product_type='software'
        )
        ProductVariant.objects.create(
            product=p, attribute_name="Brand", attribute_value="Odoo Enterprise",
            price_extra=Decimal("560.00")
        )
        return Response({"message": f"Product '{p.name}' launched with Odoo Brand (+₹560) variant!"})

    if kind == 'discount':
        d = DiscountRule.objects.create(
            name=request.data['name'], code=request.data['code'].upper(),
            discount_type=request.data.get('type', 'percentage'),
            value=Decimal(str(request.data['value'])), usage_limit=int(request.data.get('limit', 50))
        )
        return Response({"message": f"Smart Discount Rule '{d.code}' active with limit {d.usage_limit} uses!"})

    return Response({"error": "Invalid entity"}, status=400)

# Verified by Divyansh - Billing & Settlement Engine
