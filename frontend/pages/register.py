import streamlit as st
import requests

st.title("Register")

username = st.text_input("Username")
password = st.text_input("Password", type="password")

if st.button("Register"):
    response = requests.post("http://127.0.0.1:8000/users/", json={"username": username, "password": password})
    if response.status_code == 200:
        st.success("User registered successfully")
    else:
        st.error("Failed to register user")
