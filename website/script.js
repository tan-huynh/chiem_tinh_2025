document.addEventListener('DOMContentLoaded', () => {
    const monthSelect = document.getElementById('month');
    const astrologyResult = document.getElementById('astrology-result');

    const astrologyData = {
        1: "January astrology data: This month brings new beginnings and opportunities.",
        2: "February astrology data: Focus on relationships and partnerships.",
        3: "March astrology data: Time for action and new ventures.",
        4: "April astrology data: Stability and growth are highlighted.",
        5: "May astrology data: Communication and learning are key.",
        6: "June astrology data: Emotional connections and home life are important.",
        7: "July astrology data: Self-reflection and inner peace.",
        8: "August astrology data: Creativity and self-expression flourish.",
        9: "September astrology data: Organization and practical matters take precedence.",
        10: "October astrology data: Balance and harmony in all areas.",
        11: "November astrology data: Transformation and deep insights.",
        12: "December astrology data: Celebration and looking forward to the future."
    };

    function displayAstrology(month) {
        astrologyResult.innerHTML = `<p>${astrologyData[month]}</p>`;
    }

    monthSelect.addEventListener('change', (event) => {
        displayAstrology(event.target.value);
    });

    // Display current month's astrology on page load
    const currentMonth = new Date().getMonth() + 1;
    monthSelect.value = currentMonth;
    displayAstrology(currentMonth);
});


