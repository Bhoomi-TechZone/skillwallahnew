# Pydantic models
from pydantic import BaseModel
from typing import List, Optional
class FilterTransactionsRequest(BaseModel):
    searchTerm: str
    period: str
    limit: int = 20

class GenerateCustomReportRequest(BaseModel):
    period: str
    reportType: str = 'comprehensive'
    includeTransactions: bool = True
    includeAnalytics: bool = True

class TransactionResponse(BaseModel):
    id: str
    type: str
    amount: float
    status: str
    date: str
    description: str
    reference: str

class FinancialDataResponse(BaseModel):
    totalRevenue: float
    totalPayouts: float
    pendingSettlements: float
    balance: float
    transactions: List[TransactionResponse]
    pendingCount: int
    balanceChange: float
    courseEnrollmentPercentage: float
    franchiseFeePercentage: float
    otherRevenuePercentage: float

class DashboardResponse(BaseModel):
    data: FinancialDataResponse
    revenueGrowth: float
    payoutChange: float

class PaymentGatewayConfigResponse(BaseModel):
    razorpay: bool
    stripe: bool
    paypal: bool
    successRate: float
    dailyLimit: float
