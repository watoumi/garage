"""The core trust rules of the marketplace, enforced server-side:

A car is publicly visible only if its garage is **approved**, the garage is
**not disabled**, and the car itself is **active**. These tests pin that
contract down on both the public list (`GET /cars`) and the detail endpoint
(`GET /cars/{id}`).
"""


def _public_ids(client):
    resp = client.get("/cars")
    assert resp.status_code == 200
    return {item["id"] for item in resp.json()["items"]}


def test_approved_active_car_is_publicly_visible(client, make_garage, make_car):
    garage = make_garage("approved@test.ma", approved=True)
    car = make_car(garage)

    assert car.id in _public_ids(client)
    assert client.get(f"/cars/{car.id}").status_code == 200


def test_unapproved_garage_cars_are_hidden(client, make_garage, make_car):
    garage = make_garage("pending@test.ma", approved=False)
    car = make_car(garage)

    assert car.id not in _public_ids(client)
    assert client.get(f"/cars/{car.id}").status_code == 404


def test_disabled_garage_cars_are_hidden(client, make_garage, make_car):
    garage = make_garage("disabled@test.ma", approved=True, disabled=True)
    car = make_car(garage)

    assert car.id not in _public_ids(client)
    assert client.get(f"/cars/{car.id}").status_code == 404


def test_inactive_car_is_hidden(client, make_garage, make_car):
    garage = make_garage("approved2@test.ma", approved=True)
    car = make_car(garage, is_active=False)

    assert car.id not in _public_ids(client)
    assert client.get(f"/cars/{car.id}").status_code == 404


def test_admin_approval_flips_cars_from_hidden_to_visible(
    client, make_admin, make_garage, make_car, auth_header
):
    """End-to-end: a pending garage's car appears only after an admin approves."""
    admin = make_admin()
    garage = make_garage("toapprove@test.ma", approved=False)
    car = make_car(garage)

    assert car.id not in _public_ids(client)  # hidden while pending

    resp = client.post(
        f"/admin/approve-garage?garage_id={garage.garage.id}&approve=true",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["is_approved"] is True

    assert car.id in _public_ids(client)  # visible once approved


def test_admin_disable_hides_a_previously_visible_car(
    client, make_admin, make_garage, make_car, auth_header
):
    admin = make_admin()
    garage = make_garage("good@test.ma", approved=True)
    car = make_car(garage)
    assert car.id in _public_ids(client)

    resp = client.post(
        f"/admin/disable-garage?garage_id={garage.garage.id}&disable=true",
        headers=auth_header(admin),
    )
    assert resp.status_code == 200
    assert car.id not in _public_ids(client)
