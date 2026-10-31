import random
from django.db import models
from django.utils import timezone
from datetime import timedelta

class UserAccount(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Internal Staff'),
        ('customer', 'Customer'),
    ]
    name = models.CharField(max_length=120)
    company_name = models.CharField(max_length=150, blank=True, default='')
    email = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=128)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.role})"

class OtpCode(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # 10 minutes validity
        return timezone.now() <= self.created_at + timedelta(minutes=10)

class Product(models.Model):
    TYPE_CHOICES = [
        ('software', 'Core Software'),
        ('addon', 'Switchable Add-on'),
        ('service', 'Enterprise Service'),
    ]
    name = models.CharField(max_length=150)
    product_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='software')
    sales_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name

class ProductVariant(models.Model):
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    attribute_name = models.CharField(max_length=80, default='Brand')
    attribute_value = models.CharField(max_length=80)
    price_extra = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product.name} ({self.attribute_value} +{self.price_extra})"

class Plan(models.Model):
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    name = models.CharField(max_length=120)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    billing_period = models.CharField(max_length=20, choices=PERIOD_CHOICES, default='monthly')
    min_quantity = models.PositiveIntegerField(default=1)
    available_from = models.DateField(default=timezone.now)
    available_to = models.DateField(null=True, blank=True)
    auto_close_on_end = models.BooleanField(default=False)
    allow_early_close = models.BooleanField(default=True)
    allow_pause = models.BooleanField(default=True)
    allow_renew = models.BooleanField(default=True)

class TaxRule(models.Model):
    name = models.CharField(max_length=80)
    rate_percent = models.DecimalField(max_digits=5, decimal_places=2)
    is_default = models.BooleanField(default=True)

class DiscountRule(models.Model):
    TYPE_CHOICES = [('percentage', 'Percentage (%)'), ('fixed', 'Fixed Amount')]
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=40, unique=True)
    discount_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='percentage')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_quantity = models.PositiveIntegerField(default=1)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(default=100)
    times_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

class QuotationTemplate(models.Model):
    name = models.CharField(max_length=150)
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE)
    validity_days = models.PositiveIntegerField(default=15)
    payment_terms = models.CharField(max_length=100, default='Net 15 Days')
    default_products = models.ManyToManyField(Product, blank=True)

class Subscription(models.Model):
    STAGE_CHOICES = [
        ('Draft', 'Draft'), ('Quotation', 'Quotation'),
        ('Confirmed', 'Confirmed'), ('Active', 'Active'), ('Closed', 'Closed')
    ]
    subscription_number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey(UserAccount, related_name='subscriptions', on_delete=models.CASCADE)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    discount_rule = models.ForeignKey(DiscountRule, null=True, blank=True, on_delete=models.SET_NULL)
    start_date = models.DateField(default=timezone.now)
    expiry_date = models.DateField()
    payment_terms = models.CharField(max_length=100, default='Immediate / Monthly Auto')
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default='Draft')
    is_paused = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class SubscriptionLine(models.Model):
    subscription = models.ForeignKey(Subscription, related_name='lines', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

class Invoice(models.Model):
    STATUS_CHOICES = [('Draft', 'Draft'), ('Confirmed', 'Confirmed'), ('Paid', 'Paid'), ('Cancelled', 'Cancelled')]
    invoice_number = models.CharField(max_length=40, unique=True)
    subscription = models.ForeignKey(Subscription, related_name='invoices', on_delete=models.CASCADE)
    customer = models.ForeignKey(UserAccount, related_name='invoices', on_delete=models.CASCADE)
    billing_cycle_key = models.CharField(max_length=30)
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    sent_to_customer = models.BooleanField(default=False)
    line_snapshot = models.JSONField(default=list)

    class Meta:
        unique_together = ('subscription', 'billing_cycle_key')

class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='payments', on_delete=models.CASCADE)
    method = models.CharField(max_length=40, default='Bank Wire / NEFT')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    note = models.CharField(max_length=255, blank=True, default='')
