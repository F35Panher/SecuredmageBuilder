document.getElementById('dockerfile-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;
    const baseImage = form.elements.baseImage.value;
    const appPort = form.elements.appPort.value;
    const dependencies = form.elements.dependencies.value.split(',').map(d => d.trim()).filter(d => d);
    const user = form.elements.user.value;

    const requestBody = {
        BaseImage: baseImage,
        AppPort: appPort ? parseInt(appPort, 10) : 0,
        Dependencies: dependencies,
        User: user,
    };

    const resultsContainer = document.getElementById('results-container');
    const warningsDiv = document.getElementById('warnings');
    const contentCode = document.getElementById('dockerfile-content');

    // Clear previous results
    warningsDiv.innerHTML = '';
    warningsDiv.classList.add('hidden');
    contentCode.textContent = '';

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        resultsContainer.classList.remove('hidden');

        if (!response.ok) {
            const errorText = await response.text();
            contentCode.textContent = `Error: ${errorText}`;
            return;
        }

        const data = await response.json();
        contentCode.textContent = data.DockerfileContent;
        if (data.SecurityWarnings) {
            warningsDiv.textContent = data.SecurityWarnings;
            warningsDiv.classList.remove('hidden');
        }
    } catch (error) {
        resultsContainer.classList.remove('hidden');
        contentCode.textContent = `An unexpected error occurred: ${error.message}`;
    }
});

document.getElementById('copy-btn').addEventListener('click', function() {
    const content = document.getElementById('dockerfile-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        // Visual feedback for the user
        const copyButton = document.getElementById('copy-btn');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});