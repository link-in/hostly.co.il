-- Update existing icons from MDI codes to emoji
-- עדכון האייקונים הקיימים מקודים לאמוג'י

UPDATE landing_sections
SET content = jsonb_set(
  content,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN item->>'icon' = 'mdi:bed-double' THEN jsonb_set(item, '{icon}', '"🛏️"')
        WHEN item->>'icon' = 'mdi:bed' THEN jsonb_set(item, '{icon}', '"🛏️"')
        WHEN item->>'icon' = 'mdi:map-marker' THEN jsonb_set(item, '{icon}', '"📍"')
        WHEN item->>'icon' = 'mdi:door-open' THEN jsonb_set(item, '{icon}', '"🚪"')
        WHEN item->>'icon' = 'mdi:door' THEN jsonb_set(item, '{icon}', '"🚪"')
        WHEN item->>'icon' = 'mdi:image-filter-hdr' THEN jsonb_set(item, '{icon}', '"🏞️"')
        WHEN item->>'icon' = 'mdi:view-dashboard' THEN jsonb_set(item, '{icon}', '"🏞️"')
        WHEN item->>'icon' = 'mdi:kitchen' THEN jsonb_set(item, '{icon}', '"🍽️"')
        WHEN item->>'icon' = 'mdi:sofa' THEN jsonb_set(item, '{icon}', '"🛋️"')
        WHEN item->>'icon' = 'mdi:wifi' THEN jsonb_set(item, '{icon}', '"📶"')
        WHEN item->>'icon' = 'mdi:car' THEN jsonb_set(item, '{icon}', '"🚗"')
        WHEN item->>'icon' = 'mdi:parking' THEN jsonb_set(item, '{icon}', '"🅿️"')
        WHEN item->>'icon' = 'mdi:air-conditioner' THEN jsonb_set(item, '{icon}', '"❄️"')
        WHEN item->>'icon' = 'mdi:snowflake' THEN jsonb_set(item, '{icon}', '"❄️"')
        WHEN item->>'icon' = 'mdi:shower' THEN jsonb_set(item, '{icon}', '"🚿"')
        WHEN item->>'icon' = 'mdi:coffee' THEN jsonb_set(item, '{icon}', '"☕"')
        WHEN item->>'icon' = 'mdi:food' THEN jsonb_set(item, '{icon}', '"🍽️"')
        WHEN item->>'icon' = 'mdi:silverware' THEN jsonb_set(item, '{icon}', '"🍽️"')
        WHEN item->>'icon' = 'mdi:pool' THEN jsonb_set(item, '{icon}', '"🏊"')
        WHEN item->>'icon' = 'mdi:tree' THEN jsonb_set(item, '{icon}', '"🌳"')
        WHEN item->>'icon' = 'mdi:nature' THEN jsonb_set(item, '{icon}', '"🌳"')
        WHEN item->>'icon' = 'mdi:home' THEN jsonb_set(item, '{icon}', '"🏠"')
        WHEN item->>'icon' = 'mdi:television' THEN jsonb_set(item, '{icon}', '"📺"')
        WHEN item->>'icon' = 'mdi:fire' THEN jsonb_set(item, '{icon}', '"🔥"')
        WHEN item->>'icon' = 'mdi:grill' THEN jsonb_set(item, '{icon}', '"🔥"')
        WHEN item->>'icon' = 'mdi:star' THEN jsonb_set(item, '{icon}', '"⭐"')
        WHEN item->>'icon' = 'mdi:heart' THEN jsonb_set(item, '{icon}', '"❤️"')
        WHEN item->>'icon' = 'mdi:baby' THEN jsonb_set(item, '{icon}', '"👶"')
        WHEN item->>'icon' = 'mdi:dog' THEN jsonb_set(item, '{icon}', '"🐕"')
        WHEN item->>'icon' = 'mdi:paw' THEN jsonb_set(item, '{icon}', '"🐾"')
        WHEN item->>'icon' = 'mdi:flower' THEN jsonb_set(item, '{icon}', '"🌸"')
        WHEN item->>'icon' = 'mdi:sun' THEN jsonb_set(item, '{icon}', '"☀️"')
        WHEN item->>'icon' = 'mdi:moon' THEN jsonb_set(item, '{icon}', '"🌙"')
        WHEN item->>'icon' = 'mdi:mountain' THEN jsonb_set(item, '{icon}', '"⛰️"')
        WHEN item->>'icon' = 'mdi:beach' THEN jsonb_set(item, '{icon}', '"🏖️"')
        WHEN item->>'icon' = 'mdi:umbrella' THEN jsonb_set(item, '{icon}', '"☂️"')
        WHEN item->>'icon' = 'mdi:key' THEN jsonb_set(item, '{icon}', '"🔑"')
        WHEN item->>'icon' = 'mdi:lock' THEN jsonb_set(item, '{icon}', '"🔒"')
        WHEN item->>'icon' = 'mdi:phone' THEN jsonb_set(item, '{icon}', '"📞"')
        WHEN item->>'icon' = 'mdi:email' THEN jsonb_set(item, '{icon}', '"✉️"')
        WHEN item->>'icon' = 'mdi:location' THEN jsonb_set(item, '{icon}', '"📍"')
        WHEN item->>'icon' = 'mdi:bike' THEN jsonb_set(item, '{icon}', '"🚴"')
        WHEN item->>'icon' = 'mdi:walk' THEN jsonb_set(item, '{icon}', '"🚶"')
        WHEN item->>'icon' = 'mdi:hiking' THEN jsonb_set(item, '{icon}', '"🥾"')
        -- אם זה כבר אמוג'י או לא מוכר, נשאיר כמו שזה
        ELSE item
      END
    )
    FROM jsonb_array_elements(content->'items') AS item
  )
)
WHERE section_type = 'features'
  AND content ? 'items'
  AND jsonb_typeof(content->'items') = 'array';
