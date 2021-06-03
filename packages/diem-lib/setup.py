from setuptools import find_packages, setup

with open("readme.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="diemlib",  # Replace with your own username
    version="1.1.0",
    author="Guy Huinen",
    author_email="guy_huinen@be.ibm.com",
    description="Python Utilities for DIEM",
    license="MIT",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/IBM/diem/tree/main/packages/diemlib",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
)
