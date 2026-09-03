"""Provision trusted staff locally; public registration remains farmer-only."""
import argparse
from getpass import getpass
from .auth import create_account
from .database import initialize, connection
from .routers.auth import Registration
from .store import get_centre


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('username')
    parser.add_argument('role', choices=['operator','government','super_admin'])
    parser.add_argument('--centre')
    args = parser.parse_args()
    if args.role == 'operator' and not get_centre(args.centre):
        parser.error('Operators require --centre with a valid mandi ID')
    password = getpass('Password (12–128 characters): ')
    if password != getpass('Confirm password: '):
        parser.error('Passwords do not match')
    data = Registration(username=args.username,password=password,name=args.username)
    initialize()
    with connection() as db:
        create_account(db,data.username.lower(),password,data.name,args.role,args.centre)
    print('Staff account created:',args.role)


if __name__=='__main__':
    main()
