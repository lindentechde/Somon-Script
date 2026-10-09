/**
 * Tajik translations of the most common TypeScript diagnostics, in the format
 * of TypeScript's own translations (`typescript/lib/<locale>/
 * diagnosticMessages.generated.json`): message key → text with `{0}`, `{1}`, …
 * placeholders. Diagnostics without an entry stay in English.
 */
export const TAJIK_DIAGNOSTIC_MESSAGES: Readonly<Record<string, string>> = {
  // Assignability
  Type_0_is_not_assignable_to_type_1_2322: "Навъи '{0}' ба навъи '{1}' мувофиқ нест.",
  Argument_of_type_0_is_not_assignable_to_parameter_of_type_1_2345:
    "Аргументи навъи '{0}' ба параметри навъи '{1}' мувофиқ нест.",
  Type_0_is_not_assignable_to_type_1_Did_you_mean_2_2820:
    "Навъи '{0}' ба навъи '{1}' мувофиқ нест. Шояд '{2}' дар назар буд?",
  Types_of_property_0_are_incompatible_2326: "Навъҳои хосияти '{0}' мувофиқ нестанд.",
  Types_of_parameters_0_and_1_are_incompatible_2328:
    "Навъҳои параметрҳои '{0}' ва '{1}' мувофиқ нестанд.",
  Call_signature_return_types_0_and_1_are_incompatible_2202:
    "Навъҳои бозгашти '{0}' ва '{1}' мувофиқ нестанд.",
  The_types_returned_by_0_are_incompatible_between_these_types_2201:
    "Навъҳое, ки '{0}' бармегардонад, байни ин навъҳо мувофиқ нестанд.",
  Type_0_is_missing_the_following_properties_from_type_1_Colon_2_2739:
    "Дар навъи '{0}' ин хосиятҳои навъи '{1}' нестанд: {2}",
  Type_0_is_missing_the_following_properties_from_type_1_Colon_2_and_3_more_2740:
    "Дар навъи '{0}' ин хосиятҳои навъи '{1}' нестанд: {2} ва {3} хосияти дигар.",
  Property_0_is_missing_in_type_1_but_required_in_type_2_2741:
    "Хосияти '{0}' дар навъи '{1}' нест, вале дар навъи '{2}' ҳатмист.",
  Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1_2353:
    "Объекти литералӣ танҳо хосиятҳои маълумро дошта метавонад, вале '{0}' дар навъи '{1}' нест.",
  Type_0_has_no_properties_in_common_with_type_1_2559:
    "Навъи '{0}' бо навъи '{1}' ягон хосияти умумӣ надорад.",
  Index_signature_for_type_0_is_missing_in_type_1_2329:
    "Имзои индекс барои навъи '{0}' дар навъи '{1}' нест.",
  Target_requires_0_element_s_but_source_may_have_fewer_2620:
    'Ҳадаф {0} унсур талаб мекунад, вале манбаъ метавонад камтар дошта бошад.',
  Type_0_does_not_satisfy_the_constraint_1_2344: "Навъи '{0}' ба маҳдудияти '{1}' мувофиқ нест.",
  Type_0_does_not_satisfy_the_expected_type_1_1360:
    "Навъи '{0}' ба навъи интизоршудаи '{1}' мувофиқ нест.",
  Conversion_of_type_0_to_type_1_may_be_a_mistake_because_neither_type_sufficiently_overlaps_with_the__2352:
    "Табдили навъи '{0}' ба навъи '{1}' шояд хато бошад, зеро ин навъҳо қариб мувофиқат намекунанд. Агар ин қасдан бошад, ифодаро аввал ба 'unknown' табдил диҳед.",
  Type_0_is_not_comparable_to_type_1_2678: "Навъи '{0}' бо навъи '{1}' муқоисашаванда нест.",
  This_comparison_appears_to_be_unintentional_because_the_types_0_and_1_have_no_overlap_2367:
    "Ин муқоиса тасодуфӣ менамояд, зеро навъҳои '{0}' ва '{1}' ҳеҷ мувофиқат надоранд.",

  // Names and members
  Cannot_find_name_0_2304: "Номи '{0}' ёфт нашуд.",
  Cannot_find_name_0_Did_you_mean_1_2552: "Номи '{0}' ёфт нашуд. Шояд '{1}' дар назар буд?",
  Cannot_find_name_0_Do_you_need_to_install_type_definitions_for_node_Try_npm_i_save_dev_types_Slashno_2580:
    "Номи '{0}' ёфт нашуд. Шояд таърифҳои навъи Node лозиманд? `npm i --save-dev @types/node`-ро иҷро кунед.",
  Cannot_find_name_0_Do_you_need_to_change_your_target_library_Try_changing_the_lib_compiler_option_to_2584:
    "Номи '{0}' ёфт нашуд. Шояд китобхонаи ҳадафро иваз кардан лозим аст? Ба имконоти 'lib' 'dom'-ро илова кунед.",
  Property_0_does_not_exist_on_type_1_2339: "Хосияти '{0}' дар навъи '{1}' вуҷуд надорад.",
  Property_0_does_not_exist_on_type_1_Did_you_mean_2_2551:
    "Хосияти '{0}' дар навъи '{1}' вуҷуд надорад. Шояд '{2}' дар назар буд?",
  Property_0_does_not_exist_on_type_1_Do_you_need_to_change_your_target_library_Try_changing_the_lib_c_2550:
    "Хосияти '{0}' дар навъи '{1}' вуҷуд надорад. Шояд китобхонаи ҳадафро иваз кардан лозим аст? Имконоти 'lib'-ро ба '{2}' ё навтар иваз кунед.",
  Property_0_is_private_and_only_accessible_within_class_1_2341:
    "Хосияти '{0}' хосусӣ аст ва танҳо дар дохили синфи '{1}' дастрас аст.",
  Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses_2445:
    "Хосияти '{0}' муҳофизатшуда аст ва танҳо дар синфи '{1}' ва зерсинфҳои он дастрас аст.",
  Cannot_assign_to_0_because_it_is_a_read_only_property_2540:
    "Ба '{0}' таъин кардан мумкин нест, зеро он хосияти танҳохонӣ аст.",
  Cannot_assign_to_0_because_it_is_a_constant_2588:
    "Ба '{0}' таъин кардан мумкин нест, зеро он собит аст.",
  Duplicate_identifier_0_2300: "Номи такрории '{0}'.",
  Cannot_redeclare_block_scoped_variable_0_2451:
    "Тағйирёбандаи '{0}'-ро дубора эълон кардан мумкин нест.",
  Duplicate_function_implementation_2393: 'Татбиқи такрории функсия.',
  Block_scoped_variable_0_used_before_its_declaration_2448:
    "Тағйирёбандаи '{0}' пеш аз эълонаш истифода шудааст.",
  Class_0_used_before_its_declaration_2449: "Синфи '{0}' пеш аз эълонаш истифода шудааст.",
  Variable_0_is_used_before_being_assigned_2454:
    "Тағйирёбандаи '{0}' пеш аз гирифтани қимат истифода шудааст.",
  Property_0_is_used_before_its_initialization_2729:
    "Хосияти '{0}' пеш аз муқарраршавиаш истифода шудааст.",
  _0_only_refers_to_a_type_but_is_being_used_as_a_value_here_2693:
    "'{0}' танҳо навъ аст, вале дар ин ҷо ҳамчун қимат истифода шудааст.",
  _0_refers_to_a_value_but_is_being_used_as_a_type_here_Did_you_mean_typeof_0_2749:
    "'{0}' қимат аст, вале дар ин ҷо ҳамчун навъ истифода шудааст. Шояд 'навъи {0}' дар назар буд?",
  No_value_exists_in_scope_for_the_shorthand_property_0_Either_declare_one_or_provide_an_initializer_18004:
    "Барои хосияти кӯтоҳи '{0}' қимат вуҷуд надорад. Онро эълон кунед ё қимат диҳед.",

  // Null and undefined
  Object_is_possibly_null_2531: "Объект шояд 'null' бошад.",
  Object_is_possibly_undefined_2532: "Объект шояд 'undefined' бошад.",
  Object_is_possibly_null_or_undefined_2533: "Объект шояд 'null' ё 'undefined' бошад.",
  _0_is_possibly_null_18047: "'{0}' шояд 'null' бошад.",
  _0_is_possibly_undefined_18048: "'{0}' шояд 'undefined' бошад.",
  _0_is_possibly_null_or_undefined_18049: "'{0}' шояд 'null' ё 'undefined' бошад.",
  _0_is_of_type_unknown_18046: "'{0}' навъи 'unknown' дорад.",
  Object_is_of_type_unknown_2571: "Объект навъи 'unknown' дорад.",
  Cannot_invoke_an_object_which_is_possibly_undefined_2722:
    "Объектеро, ки шояд 'undefined' бошад, даъват кардан мумкин нест.",
  Cannot_invoke_an_object_which_is_possibly_null_2721:
    "Объектеро, ки шояд 'null' бошад, даъват кардан мумкин нест.",

  // Calls
  Expected_0_arguments_but_got_1_2554: '{0} аргумент интизор буд, вале {1} дода шуд.',
  Expected_at_least_0_arguments_but_got_1_2555:
    'Ақаллан {0} аргумент интизор буд, вале {1} дода шуд.',
  An_argument_for_0_was_not_provided_6210: "Барои '{0}' аргумент дода нашуд.",
  Expected_0_type_arguments_but_got_1_2558: '{0} аргументи навъ интизор буд, вале {1} дода шуд.',
  A_spread_argument_must_either_have_a_tuple_type_or_be_passed_to_a_rest_parameter_2556:
    'Аргументи паҳншаванда (...) бояд навъи кортеж дошта бошад ё ба параметри боқимонда дода шавад.',
  No_overload_matches_this_call_2769: 'Ҳеҷ як варианти функсия ба ин даъват мувофиқ нест.',
  Overload_0_of_1_2_gave_the_following_error_2772: "Варианти {0} аз {1}, '{2}', ин хаторо дод.",
  This_expression_is_not_callable_2349: 'Ин ифодаро даъват кардан мумкин нест.',
  This_expression_is_not_constructable_2351: "Аз ин ифода бо 'нав' намуна сохтан мумкин нест.",
  Value_of_type_0_is_not_callable_Did_you_mean_to_include_new_2348:
    "Қимати навъи '{0}' даъватшаванда нест. Шояд 'нав' лозим буд?",

  // Functions and returns
  A_function_whose_declared_type_is_neither_undefined_void_nor_any_must_return_a_value_2355:
    "Функсияе, ки навъи эълоншудааш 'undefined', 'void' ё 'any' нест, бояд қимат баргардонад.",
  Function_lacks_ending_return_statement_and_return_type_does_not_include_undefined_2366:
    "Дар охири функсия 'бозгашт' нест ва навъи бозгашт 'undefined'-ро дар бар намегирад.",
  Not_all_code_paths_return_a_value_7030: 'На ҳамаи роҳҳои код қимат бармегардонанд.',
  A_get_accessor_must_return_a_value_2378: "Хонандаи 'get' бояд қимат баргардонад.",
  A_function_returning_never_cannot_have_a_reachable_end_point_2534:
    "Функсияе, ки 'never' бармегардонад, набояд ба охир расад.",
  await_expressions_are_only_allowed_within_async_functions_and_at_the_top_levels_of_modules_1308:
    "Ифодаҳои 'интизор' танҳо дар функсияҳои 'ҳамзамон' ва дар сатҳи болоии модулҳо иҷозатанд.",

  // Implicit any (strict mode)
  Parameter_0_implicitly_has_an_1_type_7006:
    "Параметри '{0}' ба таври ғайримустақим навъи '{1}' дорад.",
  Variable_0_implicitly_has_an_1_type_7005:
    "Тағйирёбандаи '{0}' ба таври ғайримустақим навъи '{1}' дорад.",
  Member_0_implicitly_has_an_1_type_7008: "Узви '{0}' ба таври ғайримустақим навъи '{1}' дорад.",
  Binding_element_0_implicitly_has_an_1_type_7031:
    "Унсури '{0}' ба таври ғайримустақим навъи '{1}' дорад.",
  Variable_0_implicitly_has_type_1_in_some_locations_where_its_type_cannot_be_determined_7034:
    "Тағйирёбандаи '{0}' дар баъзе ҷойҳо, ки навъаш муайян намешавад, ба таври ғайримустақим навъи '{1}' дорад.",
  Element_implicitly_has_an_any_type_because_expression_of_type_0_can_t_be_used_to_index_type_1_7053:
    "Унсур ба таври ғайримустақим навъи 'any' дорад, зеро бо ифодаи навъи '{0}' навъи '{1}'-ро индекс кардан мумкин нест.",
  No_index_signature_with_a_parameter_of_type_0_was_found_on_type_1_7054:
    "Дар навъи '{1}' имзои индекс бо параметри навъи '{0}' ёфт нашуд.",
  this_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_2683:
    "'ин' ба таври ғайримустақим навъи 'any' дорад, зеро навъаш нишон дода нашудааст.",

  // Arithmetic and operators
  Operator_0_cannot_be_applied_to_types_1_and_2_2365:
    "Амалгари '{0}'-ро ба навъҳои '{1}' ва '{2}' истифода бурдан мумкин нест.",
  The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type_2362:
    "Тарафи чапи амали арифметикӣ бояд навъи 'any', 'number', 'bigint' ё шумориш дошта бошад.",
  The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_bigint_or_an_enum_type_2363:
    "Тарафи рости амали арифметикӣ бояд навъи 'any', 'number', 'bigint' ё шумориш дошта бошад.",
  Type_0_cannot_be_used_as_an_index_type_2538:
    "Навъи '{0}'-ро ҳамчун навъи индекс истифода бурдан мумкин нест.",
  Type_0_cannot_be_used_to_index_type_1_2536:
    "Бо навъи '{0}' навъи '{1}'-ро индекс кардан мумкин нест.",
  Tuple_type_0_of_length_1_has_no_element_at_index_2_2493:
    "Кортежи '{0}' бо дарозии '{1}' дар индекси '{2}' унсур надорад.",
  Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator_2488:
    "Навъи '{0}' бояд усули '[Symbol.iterator]()'-ро дошта бошад, ки итератор бармегардонад.",
  Type_0_is_not_an_array_type_2461: "Навъи '{0}' рӯйхат нест.",
  Spread_types_may_only_be_created_from_object_types_2698:
    'Навъҳои паҳншавандаро танҳо аз навъҳои объектӣ сохтан мумкин аст.',

  // Classes
  Property_0_has_no_initializer_and_is_not_definitely_assigned_in_the_constructor_2564:
    "Хосияти '{0}' қимати ибтидоӣ надорад ва дар конструктор ҳатман таъин намешавад.",
  Class_0_incorrectly_implements_interface_1_2420:
    "Синфи '{0}' интерфейси '{1}'-ро нодуруст татбиқ мекунад.",
  Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2_2515:
    "Синфи ғайримавҳуми '{0}' узви мавҳуми '{1}'-и аз синфи '{2}' меросгирифтаро татбиқ намекунад.",
  Cannot_create_an_instance_of_an_abstract_class_2511: 'Аз синфи мавҳум намуна сохтан мумкин нест.',
  Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2_2416:
    "Хосияти '{0}' дар навъи '{1}' ба ҳамон хосият дар навъи асосии '{2}' мувофиқ нест.",
  Constructors_for_derived_classes_must_contain_a_super_call_2377:
    "Конструктори синфи меросгиранда бояд 'супер(…)'-ро даъват кунад.",
  Interface_0_incorrectly_extends_interface_1_2430:
    "Интерфейси '{0}' интерфейси '{1}'-ро нодуруст мерос мегирад.",

  // Modules and types
  Cannot_find_module_0_or_its_corresponding_type_declarations_2307:
    "Модули '{0}' ё эълонҳои навъи он ёфт нашуд.",
  Module_0_has_no_exported_member_1_2305: "Модули '{0}' узви содиршудаи '{1}' надорад.",
  _0_has_no_exported_member_named_1_Did_you_mean_2_2724:
    "'{0}' узви содиршудаи '{1}' надорад. Шояд '{2}' дар назар буд?",
  Module_0_declares_1_locally_but_it_is_not_exported_2459:
    "Модули '{0}' '{1}'-ро дар дохил эълон мекунад, вале содир намекунад.",
  Module_0_has_no_default_export_1192: "Модули '{0}' содироти пешфарз надорад.",
  File_0_is_not_a_module_2306: "Файли '{0}' модул нест.",
  Namespace_0_has_no_exported_member_1_2694: "Номфазои '{0}' узви содиршудаи '{1}' надорад.",
  Generic_type_0_requires_1_type_argument_s_2314:
    "Навъи умумии '{0}' {1} аргументи навъ талаб мекунад.",
  Generic_type_0_requires_between_1_and_2_type_arguments_2707:
    "Навъи умумии '{0}' аз {1} то {2} аргументи навъ талаб мекунад.",
  Type_0_is_not_generic_2315: "Навъи '{0}' умумӣ нест.",
  Type_instantiation_is_excessively_deep_and_possibly_infinite_2589:
    'Сохтани навъ хеле амиқ ва шояд беохир аст.',
};
