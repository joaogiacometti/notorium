-- Custom SQL migration file, put your code below! --

UPDATE "flashcard"
SET "front_normalized" = lower(
  trim(
    regexp_replace(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    regexp_replace(
                      regexp_replace(
                        "front",
                        '<img\\b[^>]*src\\s*=\\s*["'']([^"'']*)["''][^>]*>',
                        ' image:\\1 ',
                        'gi'
                      ),
                      '<img\\b[^>]*>',
                      ' ',
                      'gi'
                    ),
                    '&amp;',
                    '&'
                  ),
                  '&quot;',
                  '"'
                ),
                '&#39;',
                ''''
              ),
              '&lt;',
              '<'
            ),
            '&gt;',
            '>'
          ),
          '&nbsp;',
          ' '
        ),
        '<[^>]*>',
        ' ',
        'g'
      ),
      '\\s+',
      ' ',
      'g'
    )
  )
)
WHERE "front_normalized" IS NULL;