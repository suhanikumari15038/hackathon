from django.contrib import admin
from .models import (
    UserAccount, Product, ProductVariant, Plan, TaxRule,
    DiscountRule, QuotationTemplate, Subscription, SubscriptionLine,
    Invoice, Payment
)

admin.site.register(UserAccount)
admin.site.register(Product)
admin.site.register(ProductVariant)
admin.site.register(Plan)
admin.site.register(TaxRule)
admin.site.register(DiscountRule)
admin.site.register(QuotationTemplate)
admin.site.register(Subscription)
admin.site.register(SubscriptionLine)
admin.site.register(Invoice)
admin.site.register(Payment)
