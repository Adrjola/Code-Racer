insert into category (id, name, description, active, created_at, updated_at)
values (
    '8b65a578-5fe3-4f06-9a9e-29989d6d537f',
    'Algorithms',
    'Algorithm and data structure practice snippets',
    true,
    now(),
    now()
)
on conflict (name) do nothing;

insert into code_snippet (
    id,
    snippet_id,
    revision_number,
    title,
    source,
    content_hash,
    difficulty,
    lifecycle,
    category_id,
    created_at,
    updated_at,
    version
)
values
    (
        '2d357563-9706-43b0-b11e-e4ab2f77b1d1',
        '7f685982-9328-4746-ae41-fbd5af99864e',
        1,
        'Two Sum (Brute Force)',
        'function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i += 1) {\n    for (let j = i + 1; j < nums.length; j += 1) {\n      if (nums[i] + nums[j] === target) {\n        return [i, j];\n      }\n    }\n  }\n  return [];\n}',
        'f44f21200e3f28c9d26e1f13017da6f4f2376a7637f6e4d5bcdadf0f85e15726',
        'EASY',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    ),
    (
        '094f4d07-dcf8-4fc3-b2c7-687b7d6f4707',
        '071f4ee8-d96f-4c8a-a085-4eb36e95f6f4',
        1,
        'Reverse String',
        'function reverseString(input) {\n  return Array.from(input).reverse().join("");\n}',
        '81e47f7b6a2a3c34830cf2b4f5aa2cb2f8a58dbf7fc5f05140ecdbaf88c4f067',
        'EASY',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    ),
    (
        'fbab83aa-e7b5-4c42-91b3-3394f2f291ef',
        'e1001f6b-a245-477e-9286-f5063ce9316f',
        1,
        'Valid Parentheses',
        'function hasBalancedBrackets(text) {\n  let balance = 0;\n\n  for (const char of text) {\n    if (char === "(") {\n      balance += 1;\n      continue;\n    }\n\n    if (char === ")") {\n      balance -= 1;\n      if (balance < 0) {\n        return false;\n      }\n    }\n  }\n\n  return balance === 0;\n}',
        '22682f28cf3a2ff5dc9c6bd948c34fce9f0730a6f3dd9b90fef57c3f88d7a5b2',
        'MEDIUM',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    );