import streamlit as st
import requests

if "token" not in st.session_state:
    st.error("Please login first")
    st.stop()

token = st.session_state["token"]
headers = {"Authorization": f"Bearer {token}"}

response = requests.get("http://127.0.0.1:8000/users/me", headers=headers)
if response.status_code == 200:
    user = response.json()
    st.write(f"Welcome, {user['username']}!")
else:
    st.error("Failed to fetch user data")
