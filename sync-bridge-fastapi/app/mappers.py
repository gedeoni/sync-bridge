from app.dtos import CustomerDto, EmployeeDto, OrderDto, ProductDto
from app.exceptions import ApiException
from app.models import Customer, Employee, Order, OrderItem, Product


def map_customer(d: CustomerDto) -> Customer:
    c = Customer()
    if d.id is not None:
        c.id = d.id
    c.email = d.email
    c.first_name = d.first_name
    c.last_name = d.last_name
    c.default_currency = d.default_currency if d.default_currency is not None else "USD"
    return c


def map_product(d: ProductDto) -> Product:
    p = Product()
    if d.id is not None:
        p.id = d.id
    p.name = d.name
    p.description = d.description
    p.price = d.price
    p.currency = d.currency if d.currency is not None else "USD"
    p.active = d.active if d.active is not None else True
    p.weight_grams = d.weight_grams
    return p


def map_order(d: OrderDto) -> Order:
    o = Order()
    if d.id is not None:
        o.id = d.id
    o.order_number = d.order_number
    o.customer_id = d.customer_id
    o.status = d.status
    o.currency = d.currency if d.currency is not None else "USD"

    if d.items:
        for it in d.items:
            if it.qty is None or it.unit_price is None:
                raise ApiException(400, "Order items must include non-null qty and unit_price")

        calc = sum(it.qty * it.unit_price for it in d.items)
        if d.amount is None:
            o.amount = calc
        elif d.amount != calc:
            raise ApiException(
                400,
                f"Order amount must equal the sum of item prices (qty * unit_price). "
                f"Calculated={calc} provided={d.amount}",
            )
        else:
            o.amount = d.amount
    else:
        if d.amount is None:
            raise ApiException(400, "An order must include items or an amount")
        o.amount = d.amount

    if d.items:
        order_items = []
        for it in d.items:
            oi = OrderItem()
            if it.id is not None:
                oi.id = it.id
            oi.product_id = it.product_id
            oi.qty = it.qty
            oi.unit_price = it.unit_price
            oi.order = o
            order_items.append(oi)
        o.items = order_items

    return o


def map_employee(d: EmployeeDto) -> Employee:
    e = Employee()
    if d.id is not None:
        try:
            e.id = int(d.id)
        except ValueError:
            pass
    e.employee_id = d.employeeId
    e.first_name = d.firstName
    e.middle_name = d.middleName
    e.last_name = d.lastName
    e.gender = d.gender
    e.email = d.email
    e.phone_number = d.phoneNumber
    e.date_of_birth = d.date_of_birth
    e.nationality = d.nationality
    e.job_level = d.jobLevel
    e.department = d.department
    e.location = d.location
    e.bank_account_number = d.bankAccountNumber
    e.company = d.company
    e.job_title = d.jobTitle
    e.cost_center = d.costCenter
    e.start_date = d.startDate
    e.employee_status = d.employeeStatus
    e.manager_id = d.managerId
    e.manager_email = d.managerEmail
    e.last_modified_on = d.lastModifiedOn
    e.last_modified = d.lastModified
    return e
