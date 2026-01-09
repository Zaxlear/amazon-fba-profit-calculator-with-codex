from __future__ import annotations

import pytest

from backend.services.calculator import calculate_fba_profit


def test_fba_calculation_standard_case():
    input_data = {
        "pre_purchase": {
            "unit_cost": {"usd": 10.00},
            "quantity": 100,
            "shipping_per_unit": {"usd": 2.00},
        },
        "during_sale": {
            "selling_price": {"usd": 29.99},
            "daily_sales": 5,
            "sales_days": 20,
            "advertising_mode": "percentage",
            "ad_percentage": 10,
            "referral_fee_rate": 15,
            "fba_fee_per_unit": {"usd": 4.50},
            "monthly_storage_fee": {"usd": 0.50},
        },
        "after_sale": {"return_rate": 5, "resellable_rate": 80},
        "settings": {"exchange_rate": 7.25},
    }

    result = calculate_fba_profit(input_data)

    assert result.summary.total_revenue.usd == pytest.approx(2999.00, rel=0.01)
    assert result.summary.net_profit_margin > 0
    assert result.intermediate_values.storage_coefficient == pytest.approx(0.3333, rel=0.1)

