from __future__ import annotations

import argparse
import sys

from backend.app.auth.rbac import init_auth_db, create_user, assign_roles, get_user_by_email, get_user_roles


def cmd_init(_):
    init_auth_db()
    print("✅ Auth DB initialized")


def cmd_create_user(args):
    uid = create_user(args.email, args.password, full_name=args.name, is_active=not args.inactive)
    if args.roles:
        assign_roles(args.email, args.roles)
    print(f"✅ Created user id={uid} email={args.email}")
    if args.roles:
        print(f"   Roles: {', '.join(sorted(set(args.roles)))}")


def cmd_assign_roles(args):
    assign_roles(args.email, args.roles)
    u = get_user_by_email(args.email)
    if not u:
        print("User not found")
        sys.exit(1)
    roles = get_user_roles(int(u["id"]))
    print(f"✅ Updated roles for {args.email}: {', '.join(roles) if roles else '(none)'}")


def cmd_show(args):
    u = get_user_by_email(args.email)
    if not u:
        print("User not found")
        sys.exit(1)
    roles = get_user_roles(int(u["id"]))
    print(f"Email: {u['email']}")
    print(f"Name:  {u.get('full_name') or ''}")
    print(f"Active:{'yes' if int(u['is_active'])==1 else 'no'}")
    print(f"Roles: {', '.join(roles) if roles else '(none)'}")


def build_parser():
    p = argparse.ArgumentParser(description="RIAAS IAM (Users/Roles) CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("init", help="Initialize auth tables + seed roles")
    sp.set_defaults(fn=cmd_init)

    sp = sub.add_parser("create-user", help="Create a user (optionally with roles)")
    sp.add_argument("--email", required=True)
    sp.add_argument("--password", required=True)
    sp.add_argument("--name", default="")
    sp.add_argument("--inactive", action="store_true")
    sp.add_argument("--roles", nargs="*", default=[])
    sp.set_defaults(fn=cmd_create_user)

    sp = sub.add_parser("assign-roles", help="Assign roles to an existing user (additive)")
    sp.add_argument("--email", required=True)
    sp.add_argument("--roles", nargs="+", required=True)
    sp.set_defaults(fn=cmd_assign_roles)

    sp = sub.add_parser("show", help="Show a user + roles")
    sp.add_argument("--email", required=True)
    sp.set_defaults(fn=cmd_show)

    return p


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
