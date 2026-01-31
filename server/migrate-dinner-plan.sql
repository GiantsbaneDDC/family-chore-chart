-- Migration for Dinner Plan feature
-- Run with: sudo -u postgres psql -d chorechart -f server/migrate-dinner-plan.sql

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '🍽️',
    description TEXT,
    prep_time INT, -- minutes
    cook_time INT, -- minutes
    servings INT DEFAULT 4,
    ingredients JSONB DEFAULT '[]',
    instructions JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dinner plans table (what's for dinner each day)
CREATE TABLE IF NOT EXISTS dinner_plans (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    week_start DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(day_of_week, week_start)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dinner_plans_week ON dinner_plans(week_start);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN (tags);

-- Grant permissions
ALTER TABLE recipes OWNER TO chorechart;
ALTER TABLE dinner_plans OWNER TO chorechart;

-- Seed some sample recipes
INSERT INTO recipes (title, icon, description, prep_time, cook_time, servings, ingredients, instructions, tags) VALUES
    ('Spaghetti Bolognese', '🍝', 'Classic Italian meat sauce with pasta', 15, 45, 4, 
     '["500g beef mince", "400g spaghetti", "1 onion, diced", "2 cloves garlic", "400g crushed tomatoes", "2 tbsp tomato paste", "1 tsp oregano", "Salt and pepper", "Parmesan cheese"]',
     '["Brown mince in a large pan, drain excess fat", "Add onion and garlic, cook until soft", "Add tomatoes, paste, and oregano", "Simmer for 30 minutes", "Cook pasta according to package", "Serve sauce over pasta with parmesan"]',
     '["Italian", "Pasta", "Comfort Food", "Kid-Friendly"]'),
    
    ('Chicken Stir Fry', '🥡', 'Quick and healthy Asian-style stir fry', 15, 15, 4,
     '["500g chicken breast, sliced", "2 cups mixed vegetables", "3 tbsp soy sauce", "1 tbsp oyster sauce", "1 tsp sesame oil", "2 cloves garlic", "1 inch ginger", "Rice to serve"]',
     '["Cook rice according to package", "Stir fry chicken until golden, set aside", "Stir fry vegetables for 3-4 minutes", "Add garlic and ginger, cook 1 minute", "Return chicken, add sauces", "Serve over rice"]',
     '["Quick", "Healthy", "Asian"]'),
    
    ('Tacos', '🌮', 'Build-your-own taco night', 20, 15, 4,
     '["500g beef mince", "1 packet taco seasoning", "8 taco shells", "1 cup shredded cheese", "1 cup lettuce, shredded", "2 tomatoes, diced", "1/2 cup sour cream", "Salsa"]',
     '["Brown mince and drain fat", "Add taco seasoning with water per packet", "Simmer until thickened", "Warm taco shells", "Set up toppings bar", "Let everyone build their own tacos!"]',
     '["Mexican", "Kid-Friendly", "Quick"]'),
    
    ('Fish and Chips', '🐟', 'Crispy battered fish with hot chips', 20, 30, 4,
     '["4 fish fillets", "1 cup flour", "1 cup beer or sparkling water", "1 kg potatoes", "Oil for frying", "Salt", "Lemon wedges", "Tartare sauce"]',
     '["Cut potatoes into chips, soak in cold water", "Make batter: mix flour and beer until smooth", "Dry chips and fry at 160°C until soft", "Dip fish in batter, fry at 180°C until golden", "Fry chips again at 180°C until crispy", "Serve with lemon and tartare"]',
     '["Seafood", "Comfort Food", "Kid-Friendly"]'),
    
    ('Chicken Curry', '🍛', 'Mild and creamy chicken curry', 15, 30, 4,
     '["500g chicken thigh, cubed", "1 onion, diced", "2 tbsp curry paste", "400ml coconut milk", "1 cup chicken stock", "1 cup frozen peas", "Rice to serve", "Fresh coriander"]',
     '["Cook rice according to package", "Brown chicken in batches, set aside", "Sauté onion until soft", "Add curry paste, cook 1 minute", "Add coconut milk and stock", "Return chicken, simmer 20 mins", "Add peas, cook 5 mins", "Serve over rice with coriander"]',
     '["Asian", "Comfort Food"]')
ON CONFLICT DO NOTHING;
