from __future__ import annotations

from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
        extra="forbid",
        json_encoders={Decimal: lambda v: float(v)},
    )


class MoneyInput(APIModel):
    usd: Decimal = Field(default=Decimal("0"), ge=0)
    cny: Decimal = Field(default=Decimal("0"), ge=0)
    primary_currency: Literal["USD", "CNY"] = "USD"


class PrePurchase(APIModel):
    unit_cost: MoneyInput
    quantity: int = Field(ge=0)
    shipping_per_unit: MoneyInput


class DuringSale(APIModel):
    selling_price: MoneyInput
    daily_sales: int = Field(ge=0)
    sales_days: int = Field(ge=0)

    advertising_mode: Literal["budget", "percentage"]
    daily_ad_budget: Optional[MoneyInput] = None
    ad_percentage: Optional[Decimal] = Field(default=None, ge=0, le=100)

    referral_fee_rate: Decimal = Field(default=Decimal("15"), ge=0, le=100)
    fba_fee_per_unit: MoneyInput
    monthly_storage_fee: MoneyInput

    @model_validator(mode="after")
    def _validate_advertising_inputs(self):
        if self.advertising_mode == "budget" and self.daily_ad_budget is None:
            raise ValueError("dailyAdBudget is required when advertisingMode=budget")
        if self.advertising_mode == "percentage" and self.ad_percentage is None:
            raise ValueError("adPercentage is required when advertisingMode=percentage")
        return self


class AfterSale(APIModel):
    return_rate: Decimal = Field(default=Decimal("5"), ge=0, le=100)
    resellable_rate: Decimal = Field(default=Decimal("80"), ge=0, le=100)


class Settings(APIModel):
    exchange_rate: Decimal = Field(default=Decimal("7.25"), gt=0)


class FBACalculatorInput(APIModel):
    pre_purchase: PrePurchase
    during_sale: DuringSale
    after_sale: AfterSale
    settings: Settings


class Money(APIModel):
    usd: float
    cny: float


class Summary(APIModel):
    total_revenue: Money
    total_cost: Money
    gross_profit: Money
    gross_profit_margin: float
    net_profit: Money
    net_profit_margin: float
    profit_per_unit: Money
    roi: float
    break_even_days: Optional[float]


class CostBreakdown(APIModel):
    purchase_cost: Money
    shipping_cost: Money
    advertising_cost: Money
    referral_fee: Money
    fba_fee: Money
    storage_fee: Money
    return_processing_fee: Money
    unsellable_disposal_fee: Money
    return_loss: Money


class IntermediateValues(APIModel):
    total_sales_quantity: float
    storage_coefficient: float
    actual_storage_fee_per_unit: Money
    return_quantity: float
    resellable_quantity: float
    unsellable_quantity: float
    return_processing_fee_per_unit: Money


class FBACalculationResult(APIModel):
    summary: Summary
    cost_breakdown: CostBreakdown
    intermediate_values: IntermediateValues


class SavedProjectSummary(APIModel):
    id: str
    name: str
    description: str
    parent_id: Optional[str]
    branch_path: str
    created_at: str
    updated_at: str


class SavedProject(SavedProjectSummary):
    input: FBACalculatorInput
    result: FBACalculationResult


class ProjectNode(APIModel):
    project: SavedProjectSummary
    children: list["ProjectNode"] = Field(default_factory=list)


class ProjectCreateRequest(APIModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    input: FBACalculatorInput


class ProjectUpdateRequest(APIModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    input: FBACalculatorInput


class BranchCreateRequest(APIModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)


class DeleteProjectsResponse(APIModel):
    deleted_ids: list[str]


ProjectNode.model_rebuild()
