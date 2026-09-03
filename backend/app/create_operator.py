"""Run: python -m app.create_operator USERNAME CENTRE_ID (password is prompted)."""
import argparse
from getpass import getpass
from .auth import create_account
from .database import initialize, connection
from .store import get_centre
from .routers.auth import Registration


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("username")
    parser.add_argument("centre_id")
    args = parser.parse_args()
    if get_centre(args.centre_id) is None:
        parser.error("Unknown centre")
    password = getpass("Password (12-128 characters): ")
    if password != getpass("Confirm password: "):
        parser.error("Passwords do not match")
    validated = Registration(username=args.username, password=password, name=args.username)
    initialize()
    with connection() as db:
        create_account(db, validated.username.lower(), validated.password, validated.name, "operator", args.centre_id)
    print("Operator created for", args.centre_id)


if __name__ == "__main__":
    main()
