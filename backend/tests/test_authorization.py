"""Authorization boundaries: ownership of listings and role gating.

A garage may only touch its own inventory, and admin-only endpoints must
reject anonymous and non-admin callers.
"""


def test_garage_cannot_update_another_garages_car(
    client, make_garage, make_car, auth_header
):
    owner = make_garage("owner@test.ma")
    attacker = make_garage("attacker@test.ma")
    car = make_car(owner)

    resp = client.put(
        f"/cars/{car.id}",
        json={"price": 1},
        headers=auth_header(attacker),
    )
    assert resp.status_code == 403


def test_garage_cannot_delete_another_garages_car(
    client, make_garage, make_car, auth_header
):
    owner = make_garage("owner2@test.ma")
    attacker = make_garage("attacker2@test.ma")
    car = make_car(owner)

    resp = client.delete(f"/cars/{car.id}", headers=auth_header(attacker))
    assert resp.status_code == 403


def test_garage_can_update_its_own_car(client, make_garage, make_car, auth_header):
    owner = make_garage("owner3@test.ma")
    car = make_car(owner, price=200000)

    resp = client.put(
        f"/cars/{car.id}",
        json={"price": 175000},
        headers=auth_header(owner),
    )
    assert resp.status_code == 200
    assert resp.json()["price"] == 175000


def test_admin_endpoints_reject_anonymous_callers(client):
    assert client.get("/admin/garages").status_code == 401
    assert client.get("/admin/cars").status_code == 401


def test_admin_endpoints_reject_garage_role(client, make_garage, auth_header):
    garage = make_garage("nonadmin@test.ma")
    resp = client.get("/admin/garages", headers=auth_header(garage))
    assert resp.status_code == 403


def test_disabled_garage_account_cannot_manage_inventory(
    client, make_garage, auth_header
):
    """A disabled garage is locked out of its own management endpoints."""
    garage = make_garage("locked@test.ma", approved=True, disabled=True)
    resp = client.get("/cars/mine", headers=auth_header(garage))
    assert resp.status_code == 403
