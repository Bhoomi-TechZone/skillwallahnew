# from fastapi import Request, HTTPException, Depends

# def role_required(required_roles: list):
#     def role_checker(request: Request = Depends()):
#         user = request.state.user
#         if not user or user.get("role") not in required_roles:
#             raise HTTPException(status_code=403, detail="Permission denied")
#     return Depends(role_checker)

from fastapi import Request, HTTPException, Depends

# ✅ For checking user roles (authorization)
def role_required(required_roles: list):
    async def role_checker(request: Request):
        user = request.state.user
        if not user or user.get("role") not in required_roles:
            raise HTTPException(status_code=403, detail="Permission denied")
        return user  # Optional: Return user for access in route
    return role_checker  # ✅ DO NOT wrap with Depends()

# ✅ For checking if user is authenticated
async def get_authenticated_user(request: Request):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user
