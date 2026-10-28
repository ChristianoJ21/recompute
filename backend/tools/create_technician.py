"""Create a technician login (there is no sign-up page; PRD 15.5).

Run from backend/:  py -m tools.create_technician tech-1 "Technician One"
Asks for the password twice. Without a terminal (e.g. a Railway shell), set RECOMPUTE_NEW_PASSWORD instead.
Uses RECOMPUTE_DB_URL like the API (default sqlite:///./recompute.db).
"""
import argparse
import os
import sys
from getpass import getpass

from api.auth import create_technician
from api.main import DEFAULT_DB_URL
from db.models import make_session_factory


def ask_password():
    password = os.environ.get("RECOMPUTE_NEW_PASSWORD")
    if password:
        return password
    password = getpass("Password (min. 10 characters): ")
    if getpass("Same password again: ") != password:
        sys.exit("The two passwords differ; nothing was created.")
    return password


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("username")
    parser.add_argument("name")
    args = parser.parse_args(argv)
    session_factory = make_session_factory(os.environ.get("RECOMPUTE_DB_URL", DEFAULT_DB_URL))
    with session_factory() as session:
        try:
            create_technician(session, args.username, args.name, ask_password())
        except ValueError as error:
            sys.exit(f"Not created: {error}")
    print(f"Created technician '{args.username}'.")


if __name__ == "__main__":
    main()
