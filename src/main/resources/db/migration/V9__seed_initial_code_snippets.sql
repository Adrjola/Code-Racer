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
        $$public int[] twoSum(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
        for (int j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) {
                return new int[] {i, j};
            }
        }
    }
    return new int[0];
}$$,
        '3297d5f921df33d6f2720145986fd66a52c45e9b3d60e5a6b5d9ddb3d8ad8aad',
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
        $$public String reverseString(String input) {
    return new StringBuilder(input).reverse().toString();
}$$,
        '709a6848817c09be1bd8e5206e248674d9c6fe898ae5ceed19878e775cf9195f',
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
        $$public boolean hasBalancedBrackets(String text) {
    int balance = 0;

    for (char current : text.toCharArray()) {
        if (current == '(') {
            balance++;
            continue;
        }

        if (current == ')') {
            balance--;
            if (balance < 0) {
                return false;
            }
        }
    }

    return balance == 0;
}$$,
        '7dfbc1ed30c81db8123f061d93db63f1505e3b60568451a6f739f5fa898c94bf',
        'MEDIUM',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    )
on conflict (snippet_id, revision_number) do nothing;
