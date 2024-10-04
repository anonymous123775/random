import streamlit as st
import requests

def app():
    st.title("Login")

    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):
        response = requests.post("http://127.0.0.1:8000/token", data={"username": username, "password": password})
        if response.status_code == 200:
            token = response.json().get("access_token")
            st.session_state["token"] = token
            st.success("Logged in successfully")
            st.experimental_rerun()
        else:
            st.error("Invalid username or password")
