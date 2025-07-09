// Test the exact logic with real data structure
const testExperience = {
    title: "Senior Product Manager",
    company: "Google Inc",
    duration: "March 2020 - Present",
    description: [
        "Led cross-functional team of 12 engineers and designers to deliver new search features",
        "Increased user engagement by 35% through data-driven product improvements", 
        "Managed $2M product budget and coordinated with stakeholders across 5 departments",
        "Mentored 3 junior product managers and established PM onboarding program",
        "Collaborated with marketing team to launch products to 100M+ users globally"
    ]
};

console.log("=== TESTING EXACT LOGIC ===");
console.log("Experience object:", testExperience);
console.log("Description length:", testExperience.description.length);
console.log("Should show button?", testExperience.description.length > 3);

// Test button condition
if (testExperience.description.length > 3) {
    const hiddenCount = testExperience.description.length - 3;
    console.log("Button should say: 'Show " + hiddenCount + " more'");
} else {
    console.log("No button should appear");
}

// Test HTML generation logic
const exp = testExperience;
console.log("\n=== TESTING HTML GENERATION ===");

const buttonHtml = (exp.description || []).length > 3 ? 
    `<button class="show-more-btn">Show ${(exp.description || []).length - 3} more</button>` : 
    '';

console.log("Generated button HTML:", buttonHtml);

// Test item generation with hidden class
console.log("\n=== TESTING ITEM GENERATION ===");
const itemsHtml = (exp.description || []).map((desc, index) => {
    const hiddenClass = index >= 3 ? 'achievement-hidden' : '';
    const item = `<li class="achievement-item ${hiddenClass}" data-index="${index}">${desc}</li>`;
    console.log("Item " + index + " (hidden=" + (index >= 3) + "):", item);
    return item;
});

console.log("\n=== TESTING TOGGLE LOGIC ===");

// Simulate toggle function
function testToggleExperienceDetails() {
    const allItems = exp.description || [];
    console.log("Total items:", allItems.length);
    
    let hiddenCount = 0;
    const isExpanded = false; // Initial state
    
    allItems.forEach((desc, index) => {
        if (index >= 3) {
            hiddenCount++;
            console.log("Item " + index + " should be " + (isExpanded ? "hidden" : "shown"));
        }
    });
    
    const buttonText = isExpanded ? `Show ${hiddenCount} more` : 'Show less';
    console.log("Button text should be:", buttonText);
    console.log("Hidden count:", hiddenCount);
    
    return { hiddenCount, buttonText };
}

const result = testToggleExperienceDetails();
console.log("Final result:", result);