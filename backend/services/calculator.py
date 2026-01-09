from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Union

from backend.models.schemas import (
    CostBreakdown,
    FBACalculationResult,
    FBACalculatorInput,
    IntermediateValues,
    Money,
    MoneyInput,
    Summary,
)

TWOPLACES = Decimal("0.01")


def _q2(value: Decimal) -> Decimal:
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _money(value_usd: Decimal, exchange_rate: Decimal) -> Money:
    usd = _q2(value_usd)
    cny = _q2(usd * exchange_rate)
    return Money(usd=float(usd), cny=float(cny))


def _money_input_usd(m: MoneyInput, exchange_rate: Decimal) -> Decimal:
    if m.primary_currency == "CNY":
        return m.cny / exchange_rate
    return m.usd


def calculate_fba_profit(
    input_data: Union[FBACalculatorInput, dict]
) -> FBACalculationResult:
    if not isinstance(input_data, FBACalculatorInput):
        input_data = FBACalculatorInput.model_validate(input_data)

    exchange_rate = input_data.settings.exchange_rate

    unit_cost = _money_input_usd(input_data.pre_purchase.unit_cost, exchange_rate)
    quantity = Decimal(input_data.pre_purchase.quantity)
    shipping_per_unit = _money_input_usd(input_data.pre_purchase.shipping_per_unit, exchange_rate)

    selling_price = _money_input_usd(input_data.during_sale.selling_price, exchange_rate)
    daily_sales = Decimal(input_data.during_sale.daily_sales)
    sales_days = Decimal(input_data.during_sale.sales_days)

    referral_fee_rate = input_data.during_sale.referral_fee_rate / Decimal("100")
    fba_fee_per_unit = _money_input_usd(input_data.during_sale.fba_fee_per_unit, exchange_rate)
    monthly_storage_fee = _money_input_usd(
        input_data.during_sale.monthly_storage_fee, exchange_rate
    )

    return_rate = input_data.after_sale.return_rate / Decimal("100")
    resellable_rate = input_data.after_sale.resellable_rate / Decimal("100")

    # ========== 售前成本 ==========
    purchase_cost = unit_cost * quantity
    shipping_cost = shipping_per_unit * quantity
    total_pre_cost = purchase_cost + shipping_cost

    # ========== 售中 ==========
    planned_sales = daily_sales * sales_days
    actual_sales_quantity = min(quantity, planned_sales)

    total_revenue = selling_price * actual_sales_quantity

    if input_data.during_sale.advertising_mode == "budget":
        daily_budget = _money_input_usd(input_data.during_sale.daily_ad_budget, exchange_rate)
        advertising_cost = daily_budget * sales_days
    else:
        ad_percentage = (input_data.during_sale.ad_percentage or Decimal("0")) / Decimal("100")
        advertising_cost = total_revenue * ad_percentage

    referral_fee_per_unit = selling_price * referral_fee_rate
    total_referral_fee = referral_fee_per_unit * actual_sales_quantity

    total_fba_fee = fba_fee_per_unit * actual_sales_quantity

    avg_storage_days = sales_days / Decimal("2")
    storage_coefficient = avg_storage_days / Decimal("30") if sales_days > 0 else Decimal("0")
    actual_storage_fee_per_unit = monthly_storage_fee * storage_coefficient
    total_storage_fee = actual_storage_fee_per_unit * actual_sales_quantity

    gross_cost = (
        total_pre_cost + advertising_cost + total_referral_fee + total_fba_fee + total_storage_fee
    )

    gross_profit = total_revenue - gross_cost
    gross_profit_margin = (
        (gross_profit / total_revenue) * Decimal("100") if total_revenue > 0 else Decimal("0")
    )

    # ========== 售后 ==========
    return_quantity = actual_sales_quantity * return_rate

    return_processing_fee_per_unit = min(
        referral_fee_per_unit * Decimal("0.20"), Decimal("5.0")
    )
    total_return_processing_fee = return_processing_fee_per_unit * return_quantity

    resellable_quantity = return_quantity * resellable_rate
    unsellable_quantity = return_quantity * (Decimal("1") - resellable_rate)

    unsellable_disposal_fee = fba_fee_per_unit * unsellable_quantity
    return_loss = (unit_cost + shipping_per_unit) * unsellable_quantity

    refunded_referral_fee = referral_fee_per_unit * return_quantity
    adjusted_referral_fee = total_referral_fee - refunded_referral_fee

    total_cost = (
        total_pre_cost
        + advertising_cost
        + adjusted_referral_fee
        + total_fba_fee
        + total_storage_fee
        + total_return_processing_fee
        + unsellable_disposal_fee
        + return_loss
    )

    net_profit = total_revenue - total_cost
    net_profit_margin = (
        (net_profit / total_revenue) * Decimal("100") if total_revenue > 0 else Decimal("0")
    )

    profit_per_unit = net_profit / actual_sales_quantity if actual_sales_quantity > 0 else Decimal("0")

    total_investment = purchase_cost + shipping_cost + advertising_cost
    roi = (net_profit / total_investment) * Decimal("100") if total_investment > 0 else Decimal("0")

    break_even_days: Optional[Decimal]
    if sales_days <= 0:
        break_even_days = None
    else:
        daily_profit = net_profit / sales_days
        break_even_days = (
            (total_investment / daily_profit) if daily_profit > 0 else None
        )

    return FBACalculationResult(
        summary=Summary(
            total_revenue=_money(total_revenue, exchange_rate),
            total_cost=_money(total_cost, exchange_rate),
            gross_profit=_money(gross_profit, exchange_rate),
            gross_profit_margin=float(_q2(gross_profit_margin)),
            net_profit=_money(net_profit, exchange_rate),
            net_profit_margin=float(_q2(net_profit_margin)),
            profit_per_unit=_money(profit_per_unit, exchange_rate),
            roi=float(_q2(roi)),
            break_even_days=float(_q2(break_even_days)) if break_even_days is not None else None,
        ),
        cost_breakdown=CostBreakdown(
            purchase_cost=_money(purchase_cost, exchange_rate),
            shipping_cost=_money(shipping_cost, exchange_rate),
            advertising_cost=_money(advertising_cost, exchange_rate),
            referral_fee=_money(adjusted_referral_fee, exchange_rate),
            fba_fee=_money(total_fba_fee, exchange_rate),
            storage_fee=_money(total_storage_fee, exchange_rate),
            return_processing_fee=_money(total_return_processing_fee, exchange_rate),
            unsellable_disposal_fee=_money(unsellable_disposal_fee, exchange_rate),
            return_loss=_money(return_loss, exchange_rate),
        ),
        intermediate_values=IntermediateValues(
            total_sales_quantity=float(_q2(actual_sales_quantity)),
            storage_coefficient=float(storage_coefficient.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)),
            actual_storage_fee_per_unit=_money(actual_storage_fee_per_unit, exchange_rate),
            return_quantity=float(_q2(return_quantity)),
            resellable_quantity=float(_q2(resellable_quantity)),
            unsellable_quantity=float(_q2(unsellable_quantity)),
            return_processing_fee_per_unit=_money(return_processing_fee_per_unit, exchange_rate),
        ),
    )
