import streamlit as st
from pages import login_page , dashboard, register

st.sidebar.title("Navigation")
page = st.sidebar.radio("Go to", ["Main", "Login", "Dashboard", "Register"])

if page == "Main":
    st.title("Main Page")
    st.write("Welcome to the Main Page")
elif page == "Login":
    login_page.app()
elif page == "Dashboard":
    dashboard.app()
elif page == "Register":
    register.app()
