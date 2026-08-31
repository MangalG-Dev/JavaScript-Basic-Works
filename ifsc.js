async function getIFSC() {

    const bank = document.getElementById("bank").value.trim();
    const branch = document.getElementById("branch").value.trim();

    const loading = document.getElementById("loading");
    const errorMessage = document.getElementById("errorMessage");
    const resultCard = document.getElementById("resultCard");
    const searchBtn = document.getElementById("searchBtn");

    // Clear previous results
    resultCard.classList.add("d-none");
    errorMessage.classList.add("d-none");

    // Validation
    if (!bank || !branch) {

        errorMessage.textContent =
            "Please enter both bank name and branch name.";

        errorMessage.classList.remove("d-none");

        return;
    }

    // Show loading
    loading.classList.remove("d-none");
    searchBtn.disabled = true;

    try {

        const res = await fetch(
            "https://ifsc-code-fetch.onrender.com/api/",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    q_bank: bank,
                    q_branch: branch
                })
            }
        );

        if (!res.ok) {
            throw new Error(
                "Server returned an error: " + res.status
            );
        }

        const data = await res.json();

        console.log("API Response:", data);

        /*
            IMPORTANT:

            The exact property names depend on what
            your API returns.

            For example, if API returns:

            {
                bank: "ICICI BANK",
                branch: "CONNAUGHT PLACE",
                ifsc: "ICIC0000001",
                address: "...",
                city: "Delhi",
                state: "Delhi"
            }

            then the following will work.
        */

        document.getElementById("resultBank").textContent =
            data.bank || bank;

        document.getElementById("resultBranch").textContent =
            data.branch || branch;

        document.getElementById("resultIFSC").textContent =
            data.ifsc || data.IFSC || "Not available";

        document.getElementById("resultAddress").textContent =
            data.address || "Not available";

        document.getElementById("resultCity").textContent =
            data.city || "Not available";

        document.getElementById("resultState").textContent =
            data.state || "Not available";

        resultCard.classList.remove("d-none");

    } catch (error) {

        console.error(error);

        errorMessage.textContent =
            "Unable to fetch IFSC details. Please check the bank/branch name or try again.";

        errorMessage.classList.remove("d-none");

    } finally {

        loading.classList.add("d-none");
        searchBtn.disabled = false;

    }
}
